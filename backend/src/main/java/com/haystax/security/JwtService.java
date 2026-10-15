package com.haystax.security;

import com.haystax.config.JwtConfig;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Verifies Supabase-issued JWTs (HS256 shared secret per decision D-JWT) and
 * extracts the subject.
 * <p>
 * Required claims (decision D-JWT): valid signature (HMAC-SHA256 over the raw
 * UTF-8 bytes of {@code HAYSTAX_JWT_SECRET}), not expired, {@code aud} =
 * {@code authenticated}, {@code sub} = a user UUID. Role flags ({@code is_owner}
 * / {@code is_admin}) are read for the security filter's authorities ONLY — the
 * owner slice never decides roles from token claims; it always loads
 * {@code public.profiles} by subject (decision D-ROLES).
 * <p>
 * Signature verification uses the JDK's built-in {@link Mac} — no extra library,
 * so no shared {@code pom.xml} change was needed.
 */
@Service
public class JwtService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String ALG = "HmacSHA256";
    private static final String EXPECTED_AUD = "authenticated";

    private final JwtConfig config;

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
     * @return claims only when the token is structurally valid, correctly signed,
     *         not expired, has {@code aud = authenticated} and a UUID {@code sub}.
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

            byte[] expected = hmacSha256(signingInput, config.getSecret());
            byte[] actual = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(expected, actual)) {
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

            String aud = payload.path("aud").asText();
            if (!EXPECTED_AUD.equals(aud)) {
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

    private static byte[] hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance(ALG);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALG));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    public record JwtClaims(String subject, String email, boolean isOwner, boolean isAdmin) {
    }
}
