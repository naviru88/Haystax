package com.haystax.security;

import com.haystax.config.JwtConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Verifies Supabase-issued JWTs and extracts the subject.
 * <p>
 * Supabase has two token-signing modes and this service supports both:
 * <ul>
 *   <li><b>Asymmetric (ES256 / RS256)</b> — the current default for new projects. Access
 *       tokens are signed with a private key held by Supabase and verified here with the
 *       matching public key published at
 *       {@code {project-url}/auth/v1/.well-known/jwks.json}. No shared secret exists, which
 *       is why an HS256-only verifier rejects every real token with a 401.</li>
 *   <li><b>Legacy symmetric (HS256)</b> — {@code HAYSTAX_JWT_SECRET} shared secret, kept for
 *       older projects and for the unit tests that sign their own tokens.</li>
 * </ul>
 * The algorithm is taken from the token header, never assumed.
 * <p>
 * Required claims (decision D-JWT): valid signature, not expired, {@code aud} =
 * {@code authenticated}, {@code sub} = a user UUID. Role flags ({@code is_owner} /
 * {@code is_admin}) are read for the security filter's authorities ONLY — the owner slice
 * never decides roles from token claims; it always loads {@code public.profiles} by subject
 * (decision D-ROLES).
 * <p>
 * Verification uses the JDK only (Mac / Signature / KeyFactory) — no extra library, so no
 * shared {@code pom.xml} change was needed.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String HS_ALG = "HmacSHA256";
    private static final String EXPECTED_AUD = "authenticated";

    /** How long a fetched JWKS is trusted before it is fetched again. */
    private static final Duration JWKS_TTL = Duration.ofMinutes(10);
    /** Minimum gap between fetches, so an unknown {@code kid} cannot trigger a request storm. */
    private static final Duration JWKS_MIN_INTERVAL = Duration.ofSeconds(30);

    private final JwtConfig config;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    /** kid → public key. Replaced wholesale on refresh, never mutated. */
    private volatile Map<String, PublicKey> jwks = Map.of();
    private volatile Instant jwksFetchedAt = Instant.EPOCH;
    private volatile Instant jwksLastAttempt = Instant.EPOCH;
    private volatile String jwksWarnedFor;

    public JwtService(JwtConfig config) {
        this.config = config;
    }

    public String getIssuer() {
        return config.getIssuer();
    }

    public Optional<String> extractSubject(String token) {
        return extractClaims(token).map(JwtClaims::subject);
    }

    /**
     * @return claims only when the token is structurally valid, correctly signed by the
     *         algorithm named in its header, not expired, has {@code aud} =
     *         {@code authenticated} and a UUID {@code sub}.
     */
    public Optional<JwtClaims> extractClaims(String token) {
        try {
            if (token == null || token.isBlank()) {
                return Optional.empty();
            }
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }

            String signingInput = parts[0] + "." + parts[1];
            byte[] signature = Base64.getUrlDecoder().decode(parts[2]);

            JsonNode header = MAPPER.readTree(
                    new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8));
            String alg = header.path("alg").asText("");
            String kid = header.path("kid").asText("");

            if (!isSignatureValid(alg, kid, signingInput, signature)) {
                return Optional.empty();
            }

            String payloadJson = new String(
                    Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            JsonNode payload = MAPPER.readTree(payloadJson);

            String email = payload.path("email").asText("");
            String sub = payload.path("sub").asText();
            if (sub.isBlank()) {
                return Optional.empty();
            }
            try {
                UUID.fromString(sub);
            } catch (IllegalArgumentException e) {
                return Optional.empty();
            }

            if (!hasExpectedAudience(payload)) {
                return Optional.empty();
            }

            long exp = payload.path("exp").asLong(0L);
            if (exp <= 0L || Instant.now().getEpochSecond() >= exp) {
                return Optional.empty();
            }

            boolean isOwner = payload.path("is_owner").asBoolean(false);
            boolean isAdmin = payload.path("is_admin").asBoolean(false);

            return Optional.of(new JwtClaims(sub, email, isOwner, isAdmin));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    // ---------------------------------------------------------------- signature checks

    /** Dispatches on the header {@code alg} — the token decides, not a server default. */
    private boolean isSignatureValid(String alg, String kid, String signingInput, byte[] signature) {
        return switch (alg) {
            case "HS256" -> verifyHmac(signingInput, signature);
            case "ES256" -> verifyWithJwks("SHA256withECDSA", kid, signingInput, signature);
            case "RS256" -> verifyWithJwks("SHA256withRSA", kid, signingInput, signature);
            default -> {
                log.debug("Rejecting token with unsupported alg '{}'", alg);
                yield false;
            }
        };
    }

    /** Legacy shared-secret path (D-JWT). Constant-time compare. */
    private boolean verifyHmac(String signingInput, byte[] signature) {
        String secret = config.getSecret();
        if (secret == null || secret.isBlank()) {
            return false;
        }
        try {
            byte[] expected = hmacSha256(signingInput, secret);
            return MessageDigest.isEqual(expected, signature);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Verifies against the public keys published in the project's JWKS. On an unknown
     * {@code kid} the cache is refreshed once (rate-limited), which is what makes key
     * rotation work without a restart.
     */
    private boolean verifyWithJwks(String jdkAlgorithm, String kid,
                                   String signingInput, byte[] signature) {
        byte[] toVerify = "SHA256withECDSA".equals(jdkAlgorithm)
                ? joseEcdsaToDer(signature)   // JOSE packs R||S, the JDK expects DER
                : signature;

        for (PublicKey key : candidateKeys(kid)) {
            try {
                Signature verifier = Signature.getInstance(jdkAlgorithm);
                verifier.initVerify(key);
                verifier.update(signingInput.getBytes(StandardCharsets.UTF_8));
                if (verifier.verify(toVerify)) {
                    return true;
                }
            } catch (Exception e) {
                log.debug("Signature check failed for kid '{}': {}", kid, e.getMessage());
            }
        }
        return false;
    }

    /**
     * Keys to try for a token. A known {@code kid} short-circuits to one key; a blank or
     * unknown {@code kid} falls back to trying every published key (a project usually has
     * exactly one).
     */
    private List<PublicKey> candidateKeys(String kid) {
        Map<String, PublicKey> keys = jwks;

        PublicKey exact = kid.isBlank() ? null : keys.get(kid);
        if (exact != null && Instant.now().isBefore(jwksFetchedAt.plus(JWKS_TTL))) {
            return List.of(exact);
        }

        // Unknown kid, empty cache, or stale cache: refresh (rate-limited) and retry.
        keys = refreshJwksIfAllowed();
        if (!kid.isBlank()) {
            PublicKey refreshed = keys.get(kid);
            if (refreshed != null) {
                return List.of(refreshed);
            }
        }
        return new ArrayList<>(keys.values());
    }

    // ---------------------------------------------------------------- JWKS cache

    private Map<String, PublicKey> refreshJwksIfAllowed() {
        Instant now = Instant.now();
        if (now.isBefore(jwksLastAttempt.plus(JWKS_MIN_INTERVAL))
                && now.isBefore(jwksFetchedAt.plus(JWKS_TTL))) {
            return jwks;   // too soon to ask again, and what we have is not stale yet
        }

        synchronized (this) {
            now = Instant.now();
            if (now.isBefore(jwksLastAttempt.plus(JWKS_MIN_INTERVAL))
                    && now.isBefore(jwksFetchedAt.plus(JWKS_TTL))) {
                return jwks;
            }
            jwksLastAttempt = now;

            String url = resolvedJwksUrl();
            if (url == null) {
                warnOnce("no-jwks-url", "No Supabase project URL / JWKS URL configured "
                        + "(haystax.jwt.project-url or haystax.jwt.jwks-url) — only HS256 "
                        + "tokens can be verified.");
                return jwks;
            }
            try {
                Map<String, PublicKey> fetched = fetchJwks(url);
                if (!fetched.isEmpty()) {
                    jwks = Map.copyOf(fetched);
                    jwksFetchedAt = now;
                    log.info("Loaded {} Supabase signing key(s) from {}", jwks.size(), url);
                }
            } catch (Exception e) {
                warnOnce(url, "Could not load Supabase JWKS from {}: {}", url, e.getMessage());
            }
            return jwks;
        }
    }

    private Map<String, PublicKey> fetchJwks(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("HTTP " + response.statusCode());
        }

        JsonNode keys = MAPPER.readTree(response.body()).path("keys");
        Map<String, PublicKey> parsed = new LinkedHashMap<>();
        if (keys.isArray()) {
            for (JsonNode jwk : keys) {
                String use = jwk.path("use").asText("sig");
                if (!"sig".equals(use)) {
                    continue;
                }
                PublicKey key = toPublicKey(jwk);
                if (key == null) {
                    continue;
                }
                String kid = jwk.path("kid").asText("");
                parsed.put(kid, key);
            }
        }
        return parsed;
    }

    /** Builds an EC or RSA public key from a JWK. Unsupported key types are skipped. */
    private PublicKey toPublicKey(JsonNode jwk) {
        try {
            String kty = jwk.path("kty").asText("");
            switch (kty) {
                case "EC" -> {
                    String crv = jwk.path("crv").asText("");
                    if (!"P-256".equals(crv)) {
                        log.debug("Skipping EC key on unsupported curve '{}'", crv);
                        return null;
                    }
                    BigInteger x = new BigInteger(1, Base64.getUrlDecoder().decode(jwk.path("x").asText()));
                    BigInteger y = new BigInteger(1, Base64.getUrlDecoder().decode(jwk.path("y").asText()));
                    ECPoint point = new ECPoint(x, y);

                    AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
                    params.init(new ECGenParameterSpec("secp256r1"));
                    ECParameterSpec spec = params.getParameterSpec(ECParameterSpec.class);

                    return KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(point, spec));
                }
                case "RSA" -> {
                    BigInteger n = new BigInteger(1, Base64.getUrlDecoder().decode(jwk.path("n").asText()));
                    BigInteger e = new BigInteger(1, Base64.getUrlDecoder().decode(jwk.path("e").asText()));
                    return KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(n, e));
                }
                default -> {
                    log.debug("Skipping JWK of unsupported type '{}'", kty);
                    return null;
                }
            }
        } catch (Exception e) {
            log.warn("Ignoring malformed JWK: {}", e.getMessage());
            return null;
        }
    }

    /**
     * {@code haystax.jwt.jwks-url} when set explicitly, otherwise derived from the Supabase
     * project URL. Returns {@code null} when neither is configured (local/offline runs).
     */
    private String resolvedJwksUrl() {
        String explicit = config.getJwksUrl();
        if (explicit != null && explicit.startsWith("http")) {
            return explicit;
        }
        String project = config.getProjectUrl();
        if (project == null || project.isBlank()) {
            // Belt and braces: works even if the .env property source is not visible to
            // application.yml placeholder resolution.
            project = firstNonBlank(System.getenv("SUPABASE_URL"),
                    System.getenv("HAYSTAX_SUPABASE_URL"));
        }
        if (project == null || project.isBlank() || !project.startsWith("http")) {
            return null;
        }
        String base = project.endsWith("/") ? project.substring(0, project.length() - 1) : project;
        return base + "/auth/v1/.well-known/jwks.json";
    }

    private void warnOnce(String key, String format, Object... args) {
        if (!key.equals(jwksWarnedFor)) {
            jwksWarnedFor = key;
            log.warn(format, args);
        }
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- crypto helpers

    /**
     * JOSE ECDSA signatures are the fixed-width concatenation {@code R || S}; Java's
     * {@link Signature} expects the ASN.1 {@code SEQUENCE { INTEGER r, INTEGER s }} encoding.
     * Without this conversion every ES256 verification fails.
     */
    static byte[] joseEcdsaToDer(byte[] jose) {
        if (jose == null || jose.length == 0) {
            return new byte[0];
        }
        // 64 bytes = P-256 R||S. Anything else is assumed to be DER already.
        if (jose.length != 64) {
            return jose;
        }
        byte[] r = derInteger(Arrays.copyOfRange(jose, 0, 32));
        byte[] s = derInteger(Arrays.copyOfRange(jose, 32, 64));

        byte[] der = new byte[2 + r.length + s.length];
        der[0] = 0x30;                                  // SEQUENCE
        der[1] = (byte) (r.length + s.length);          // < 128, so a single length byte
        System.arraycopy(r, 0, der, 2, r.length);
        System.arraycopy(s, 0, der, 2 + r.length, s.length);
        return der;
    }

    private static byte[] derInteger(byte[] unsigned) {
        int offset = 0;
        while (offset < unsigned.length - 1 && unsigned[offset] == 0) {
            offset++;
        }
        byte[] magnitude = Arrays.copyOfRange(unsigned, offset, unsigned.length);
        boolean negativeIfUnsigned = (magnitude[0] & 0x80) != 0;   // needs a 0x00 prefix

        int length = magnitude.length + (negativeIfUnsigned ? 1 : 0);
        byte[] out = new byte[2 + length];
        out[0] = 0x02;                                  // INTEGER
        out[1] = (byte) length;
        int pos = 2;
        if (negativeIfUnsigned) {
            out[pos++] = 0x00;
        }
        System.arraycopy(magnitude, 0, out, pos, magnitude.length);
        return out;
    }

    private static byte[] hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance(HS_ALG);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HS_ALG));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    /** {@code aud} is a string in Supabase tokens but an array is legal JWT. */
    private static boolean hasExpectedAudience(JsonNode payload) {
        JsonNode aud = payload.path("aud");
        if (aud.isArray()) {
            for (JsonNode value : aud) {
                if (EXPECTED_AUD.equals(value.asText())) {
                    return true;
                }
            }
            return false;
        }
        return EXPECTED_AUD.equals(aud.asText());
    }

    public record JwtClaims(String subject, String email, boolean isOwner, boolean isAdmin) {
    }
}
