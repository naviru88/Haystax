package com.haystax.owner.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Builds HS256 JWTs signed with a test secret for the owner-slice security tests
 * (W2-C1). No real network or Supabase needed — mirrors what Supabase issues for
 * its {@code authenticated} audience.
 */
public final class JwtTestUtils {

    public static final String TEST_SECRET = "test-jwt-secret-for-owner-slice-tests";

    private JwtTestUtils() {
    }

    /** A fully valid token for {@code sub} with the default claims. */
    public static String validToken(UUID sub) {
        return token(sub, TEST_SECRET, claims(sub, Instant.now().plusSeconds(3600),
                "authenticated", "user@example.test"));
    }

    public static String token(UUID sub, String secret, Map<String, Object> claims) {
        String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = b64(toJson(claims));
        String signingInput = header + "." + payload;
        String sig = b64url(hmacSha256(signingInput, secret));
        return signingInput + "." + sig;
    }

    public static Map<String, Object> claims(UUID sub, Instant exp, String aud, String email) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sub", sub.toString());
        m.put("aud", aud);
        m.put("exp", exp.getEpochSecond());
        m.put("iat", Instant.now().getEpochSecond());
        m.put("email", email);
        m.put("phone", "");
        m.put("app_metadata", Map.of("provider", "email", "providers", java.util.List.of("email")));
        m.put("user_metadata", Map.of());
        m.put("role", "authenticated");
        m.put("aal", "aal1");
        m.put("amr", java.util.List.of(Map.of("method", "password", "timestamp",
                Instant.now().getEpochSecond())));
        m.put("session_id", UUID.randomUUID().toString());
        m.put("is_anonymous", false);
        return m;
    }

    public static byte[] hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String toJson(Map<String, Object> claims) {
        // Minimal JSON — only string/number/boolean/list/map values are produced.
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Object> e : claims.entrySet()) {
            if (i++ > 0) sb.append(",");
            sb.append(quote(e.getKey())).append(":").append(jsonValue(e.getValue()));
        }
        return sb.append("}").toString();
    }

    private static String jsonValue(Object v) {
        if (v == null) return "null";
        if (v instanceof String s) return quote(s);
        if (v instanceof Boolean || v instanceof Number) return v.toString();
        if (v instanceof Map<?, ?> m) {
            StringBuilder sb = new StringBuilder("{");
            int i = 0;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (i++ > 0) sb.append(",");
                sb.append(quote(String.valueOf(e.getKey()))).append(":").append(jsonValue(e.getValue()));
            }
            return sb.append("}").toString();
        }
        if (v instanceof java.util.List<?> l) {
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < l.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(jsonValue(l.get(i)));
            }
            return sb.append("]").toString();
        }
        return quote(String.valueOf(v));
    }

    private static String quote(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String b64(String s) {
        return b64url(s.getBytes(StandardCharsets.UTF_8));
    }

    private static String b64url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
