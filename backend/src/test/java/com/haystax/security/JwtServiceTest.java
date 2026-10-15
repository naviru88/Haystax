package com.haystax.security;

import com.haystax.config.JwtConfig;
import com.haystax.owner.util.JwtTestUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure unit tests for HS256 JWT validation (decision D-JWT):
 * valid, wrong signature, expired, wrong audience, malformed, missing sub, non-UUID sub.
 */
class JwtServiceTest {

    private JwtService jwtService;
    private JwtConfig config;

    @BeforeEach
    void setUp() {
        config = new JwtConfig();
        config.setSecret(JwtTestUtils.TEST_SECRET);
        jwtService = new JwtService(config);
    }

    @Test
    void validTokenReturnsSubjectAndEmail() {
        UUID sub = UUID.randomUUID();
        Optional<JwtService.JwtClaims> claims = jwtService.extractClaims(JwtTestUtils.validToken(sub));
        assertTrue(claims.isPresent());
        assertEquals(sub.toString(), claims.get().subject());
        assertEquals("user@example.test", claims.get().email());
    }

    @Test
    void tamperedSignatureRejected() {
        UUID sub = UUID.randomUUID();
        String token = JwtTestUtils.validToken(sub);
        // Deterministic corruption: replace the signature with a same-length
        // url-safe base64 string of a different 32-byte value. (Flipping the last
        // char can hit base64 padding bits and decode to the same bytes.)
        int sigStart = token.lastIndexOf('.') + 1;
        String badSig = "A".repeat(token.length() - sigStart);
        String bad = token.substring(0, sigStart) + badSig;
        assertTrue(jwtService.extractClaims(bad).isEmpty());
    }

    @Test
    void wrongSecretRejected() {
        UUID sub = UUID.randomUUID();
        String token = JwtTestUtils.token(sub, "a-completely-different-secret",
                JwtTestUtils.claims(sub, Instant.now().plusSeconds(3600), "authenticated", "u@t"));
        assertTrue(jwtService.extractClaims(token).isEmpty());
    }

    @Test
    void expiredRejected() {
        UUID sub = UUID.randomUUID();
        String token = JwtTestUtils.token(sub, JwtTestUtils.TEST_SECRET,
                JwtTestUtils.claims(sub, Instant.now().minusSeconds(60), "authenticated", "u@t"));
        assertTrue(jwtService.extractClaims(token).isEmpty());
    }

    @Test
    void wrongAudienceRejected() {
        UUID sub = UUID.randomUUID();
        String token = JwtTestUtils.token(sub, JwtTestUtils.TEST_SECRET,
                JwtTestUtils.claims(sub, Instant.now().plusSeconds(3600), "service_role", "u@t"));
        assertTrue(jwtService.extractClaims(token).isEmpty());
    }

    @Test
    void malformedTokensRejected() {
        assertTrue(jwtService.extractClaims("").isEmpty());
        assertTrue(jwtService.extractClaims("not-a-jwt").isEmpty());
        assertTrue(jwtService.extractClaims("a.b").isEmpty());
        assertTrue(jwtService.extractClaims("a.b.c.d").isEmpty());
        assertTrue(jwtService.extractClaims(null).isEmpty());
    }

    @Test
    void nonUuidSubjectRejected() {
        UUID sub = UUID.randomUUID();
        Map<String, Object> claims = JwtTestUtils.claims(sub, Instant.now().plusSeconds(3600),
                "authenticated", "u@t");
        claims.put("sub", "not-a-uuid");
        String token = JwtTestUtils.token(sub, JwtTestUtils.TEST_SECRET, claims);
        assertTrue(jwtService.extractClaims(token).isEmpty());
    }

    @Test
    void missingSubjectRejected() {
        UUID sub = UUID.randomUUID();
        Map<String, Object> claims = JwtTestUtils.claims(sub, Instant.now().plusSeconds(3600),
                "authenticated", "u@t");
        claims.put("sub", "");
        String token = JwtTestUtils.token(sub, JwtTestUtils.TEST_SECRET, claims);
        assertTrue(jwtService.extractClaims(token).isEmpty());
    }
}
