package com.haystax.security;

import com.haystax.config.JwtConfig;
import com.haystax.owner.util.JwtTestUtils;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ES256 verification against a real JWKS endpoint (decision D-JWT).
 * <p>
 * Supabase projects with asymmetric signing keys issue ES256 tokens; the public key is
 * published at {@code /auth/v1/.well-known/jwks.json}. The HS256-only verifier could never
 * validate them, so every real login produced a 401 from {@code /api/owner/auth/me} and the
 * SPA bounced the user back to the login page. These tests lock in the ES256 path, the
 * JOSE → DER signature conversion, and the key-rotation refresh.
 */
class JwtServiceEs256Test {

    private static final String KID = "test-signing-key";

    private HttpServer server;
    private JwtConfig config;
    private JwtService jwtService;
    private KeyPair keyPair;
    private String jwksJson;
    private volatile int jwksHits;

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        keyPair = generator.generateKeyPair();

        jwksJson = jwksFor((ECPublicKey) keyPair.getPublic(), KID);
        jwksHits = 0;

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/jwks.json", exchange -> {
            jwksHits++;
            byte[] body = jwksJson.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        config = new JwtConfig();
        config.setSecret(JwtTestUtils.TEST_SECRET);          // legacy path stays usable
        config.setJwksUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/jwks.json");
        jwtService = new JwtService(config);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void validEs256TokenIsAccepted() {
        UUID sub = UUID.randomUUID();
        Optional<JwtService.JwtClaims> claims =
                jwtService.extractClaims(es256Token(sub, claims(sub, Instant.now().plusSeconds(3600))));

        assertTrue(claims.isPresent(), "ES256 token signed by the published JWKS key must verify");
        assertEquals(sub.toString(), claims.get().subject());
        assertEquals("owner@example.test", claims.get().email());
    }

    @Test
    void es256TokenWithTamperedPayloadIsRejected() {
        UUID sub = UUID.randomUUID();
        String token = es256Token(sub, claims(sub, Instant.now().plusSeconds(3600)));
        String[] parts = token.split("\\.");

        // Same header, different payload (an escalated claim), original signature.
        Map<String, Object> forged = claims(sub, Instant.now().plusSeconds(3600));
        forged.put("is_admin", true);
        String forgedPayload = b64url(toJson(forged).getBytes(StandardCharsets.UTF_8));

        assertTrue(jwtService.extractClaims(parts[0] + "." + forgedPayload + "." + parts[2]).isEmpty());
    }

    @Test
    void es256TokenSignedByAnotherKeyIsRejected() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair other = generator.generateKeyPair();

        UUID sub = UUID.randomUUID();
        String token = es256Token(sub, claims(sub, Instant.now().plusSeconds(3600)), other);

        assertTrue(jwtService.extractClaims(token).isEmpty());
    }

    @Test
    void expiredEs256TokenIsRejected() {
        UUID sub = UUID.randomUUID();
        String token = es256Token(sub, claims(sub, Instant.now().minusSeconds(60)));
        assertTrue(jwtService.extractClaims(token).isEmpty());
    }

    @Test
    void wrongAudienceEs256TokenIsRejected() {
        UUID sub = UUID.randomUUID();
        Map<String, Object> c = claims(sub, Instant.now().plusSeconds(3600));
        c.put("aud", "service_role");
        assertTrue(jwtService.extractClaims(es256Token(sub, c)).isEmpty());
    }

    @Test
    void audienceAsArrayIsAccepted() {
        // JWTs may carry aud as an array; Supabase sends a string, but being lenient here
        // costs nothing and avoids surprising 401s if that ever changes.
        UUID sub = UUID.randomUUID();
        Map<String, Object> c = claims(sub, Instant.now().plusSeconds(3600));
        c.put("aud", java.util.List.of("authenticated"));
        assertTrue(jwtService.extractClaims(es256Token(sub, c)).isPresent());
    }

    @Test
    void unsupportedAlgorithmIsRejected() {
        UUID sub = UUID.randomUUID();
        String header = b64url("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = b64url(toJson(claims(sub, Instant.now().plusSeconds(3600)))
                .getBytes(StandardCharsets.UTF_8));
        assertTrue(jwtService.extractClaims(header + "." + payload + ".").isEmpty());
    }

    @Test
    void legacyHs256TokensStillVerify() {
        // Older projects (and every existing unit test) sign with the shared secret.
        UUID sub = UUID.randomUUID();
        assertTrue(jwtService.extractClaims(JwtTestUtils.validToken(sub)).isPresent());
    }

    @Test
    void jwksIsCachedAcrossVerifications() {
        UUID sub = UUID.randomUUID();
        jwtService.extractClaims(es256Token(sub, claims(sub, Instant.now().plusSeconds(3600))));
        jwtService.extractClaims(es256Token(sub, claims(sub, Instant.now().plusSeconds(3600))));
        jwtService.extractClaims(es256Token(sub, claims(sub, Instant.now().plusSeconds(3600))));

        assertEquals(1, jwksHits, "the JWKS must be fetched once and then cached");
    }

    @Test
    void rotatedSigningKeyIsPickedUpAfterRefresh() throws Exception {
        // A brand-new kid that the cache has never seen forces one refresh.
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair rotated = generator.generateKeyPair();

        UUID sub = UUID.randomUUID();
        jwtService.extractClaims(es256Token(sub, claims(sub, Instant.now().plusSeconds(3600))));

        String newKid = "rotated-key";
        jwksJson = jwksFor((ECPublicKey) rotated.getPublic(), newKid);
        // The minimum refresh interval would block an immediate refetch; a fresh service
        // models the next deploy/replica, which is what rotation actually hits.
        JwtService afterRotation = new JwtService(config);

        String token = es256Token(sub, claims(sub, Instant.now().plusSeconds(3600)), rotated, newKid);
        assertTrue(afterRotation.extractClaims(token).isPresent(),
                "a token signed with the rotated key must verify against the refreshed JWKS");
    }

    // ---------------------------------------------------------------- helpers

    private String es256Token(UUID sub, Map<String, Object> claims) {
        return es256Token(sub, claims, keyPair, KID);
    }

    private String es256Token(UUID sub, Map<String, Object> claims, KeyPair signingKey) {
        return es256Token(sub, claims, signingKey, KID);
    }

    private String es256Token(UUID sub, Map<String, Object> claims, KeyPair signingKey, String kid) {
        try {
            String header = b64url(("{\"alg\":\"ES256\",\"typ\":\"JWT\",\"kid\":\"" + kid + "\"}")
                    .getBytes(StandardCharsets.UTF_8));
            String payload = b64url(toJson(claims).getBytes(StandardCharsets.UTF_8));
            String signingInput = header + "." + payload;

            Signature signer = Signature.getInstance("SHA256withECDSA");
            signer.initSign(signingKey.getPrivate());
            signer.update(signingInput.getBytes(StandardCharsets.UTF_8));
            byte[] der = signer.sign();

            return signingInput + "." + b64url(derToJose(der));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** ASN.1 SEQUENCE { INTEGER r, INTEGER s } → the JOSE R||S form (32+32 bytes). */
    private static byte[] derToJose(byte[] der) {
        int offset = 0;
        if (der[offset++] != 0x30) {
            throw new IllegalArgumentException("not a DER SEQUENCE");
        }
        int seqLen = der[offset++] & 0xFF;
        if ((seqLen & 0x80) != 0) {                       // long form length
            int count = seqLen & 0x7F;
            offset += count;
        }
        byte[] r = readInteger(der, offset);
        offset += 2 + (der[offset + 1] & 0xFF);
        byte[] s = readInteger(der, offset);

        byte[] out = new byte[64];
        System.arraycopy(r, 0, out, 32 - r.length, r.length);
        System.arraycopy(s, 0, out, 64 - s.length, s.length);
        return out;
    }

    private static byte[] readInteger(byte[] der, int offset) {
        if (der[offset] != 0x02) {
            throw new IllegalArgumentException("not a DER INTEGER");
        }
        int len = der[offset + 1] & 0xFF;
        byte[] value = Arrays.copyOfRange(der, offset + 2, offset + 2 + len);
        // Strip the sign byte the DER encoder may have added.
        int start = 0;
        while (start < value.length - 1 && value[start] == 0) {
            start++;
        }
        return Arrays.copyOfRange(value, start, value.length);
    }

    private static String jwksFor(ECPublicKey key, String kid) {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String x = enc.encodeToString(toFixedWidth(key.getW().getAffineX()));
        String y = enc.encodeToString(toFixedWidth(key.getW().getAffineY()));
        return "{\"keys\":[{\"alg\":\"ES256\",\"crv\":\"P-256\",\"ext\":true,"
                + "\"key_ops\":[\"verify\"],\"kid\":\"" + kid + "\",\"kty\":\"EC\","
                + "\"use\":\"sig\",\"x\":\"" + x + "\",\"y\":\"" + y + "\"}]}";
    }

    private static byte[] toFixedWidth(BigInteger value) {
        byte[] raw = value.toByteArray();
        byte[] out = new byte[32];
        int copy = Math.min(raw.length, 32);
        System.arraycopy(raw, raw.length - copy, out, 32 - copy, copy);
        return out;
    }

    private static Map<String, Object> claims(UUID sub, Instant exp) {
        Map<String, Object> m = new LinkedHashMap<>(JwtTestUtils.claims(sub, exp, "authenticated",
                "owner@example.test"));
        m.put("role", "authenticated");
        return m;
    }

    private static String toJson(Map<String, Object> claims) {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Object> e : claims.entrySet()) {
            if (i++ > 0) {
                sb.append(",");
            }
            sb.append("\"").append(e.getKey()).append("\":").append(jsonValue(e.getValue()));
        }
        return sb.append("}").toString();
    }

    private static String jsonValue(Object v) {
        if (v == null) {
            return "null";
        }
        if (v instanceof String s) {
            return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
        }
        if (v instanceof Boolean || v instanceof Number) {
            return v.toString();
        }
        if (v instanceof Map<?, ?> m) {
            StringBuilder sb = new StringBuilder("{");
            int i = 0;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (i++ > 0) {
                    sb.append(",");
                }
                sb.append("\"").append(e.getKey()).append("\":").append(jsonValue(e.getValue()));
            }
            return sb.append("}").toString();
        }
        if (v instanceof java.util.List<?> l) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < l.size(); i++) {
                if (i > 0) {
                    sb.append(",");
                }
                sb.append(jsonValue(l.get(i)));
            }
            return sb.append("]").toString();
        }
        return "\"" + v + "\"";
    }

    private static String b64url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
