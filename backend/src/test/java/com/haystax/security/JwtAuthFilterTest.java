package com.haystax.security;

import com.haystax.config.JwtConfig;
import com.haystax.owner.util.JwtTestUtils;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the {@link JwtAuthFilter}: owner paths require a valid token
 * (401 + ErrorResponse shape when missing/invalid); other slices' paths are not
 * blocked (pass through unchanged, and remain reachable without a token).
 */
class JwtAuthFilterTest {

    private JwtAuthFilter filter;

    @BeforeEach
    void setUp() {
        JwtConfig config = new JwtConfig();
        config.setSecret(JwtTestUtils.TEST_SECRET);
        JwtService jwtService = new JwtService(config);
        filter = new JwtAuthFilter(jwtService);
    }

    @AfterEach
    void tearDown() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest req(String uri, String authHeader) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", uri);
        req.setRequestURI(uri);
        if (authHeader != null) {
            req.addHeader("Authorization", authHeader);
        }
        return req;
    }

    @Test
    void ownerPathWithoutTokenReturns401WithErrorShape() throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req("/api/owner/auth/me", null), res, mock(FilterChain.class));

        assertEquals(401, res.getStatus());
        String body = res.getContentAsString();
        assertTrue(body.contains("\"status\":401"));
        assertTrue(body.contains("Missing or invalid token"));
        assertTrue(body.contains("\"path\":\"/api/owner/auth/me\""));
    }

    @Test
    void ownerPathWithTamperedTokenReturns401() throws Exception {
        // Build a token whose signature is definitely wrong (signed with a
        // different secret), not a base64 char flip that may decode to the same bytes.
        UUID sub = UUID.randomUUID();
        String headerPayload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8))
                + "." + java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"" + sub + "\",\"aud\":\"authenticated\",\"exp\":"
                        + (System.currentTimeMillis() / 1000 + 3600) + "}")
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String badSig = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString(JwtTestUtils.hmacSha256(headerPayload, "wrong-secret"));
        String bad = headerPayload + "." + badSig;

        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req("/api/owner/profile", "Bearer " + bad), res, mock(FilterChain.class));

        assertEquals(401, res.getStatus());
    }

    @Test
    void ownerPathWithValidTokenPassesThroughAndSetsContext() throws Exception {
        UUID sub = UUID.randomUUID();
        String token = JwtTestUtils.validToken(sub);
        MockHttpServletRequest request = req("/api/owner/profile", "Bearer " + token);
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, res, chain);

        verify(chain).doFilter(request, res);
        assertTrue(request.getAttribute(JwtAuthFilter.CLAIMS_ATTR) instanceof JwtService.JwtClaims);
        assertEquals(sub.toString(),
                org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication().getName());
    }

    @Test
    void discoveryPathWithoutTokenIsNotBlocked() throws Exception {
        MockHttpServletRequest request = req("/api/discovery/listings", null);
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, res, chain);

        // Passes through — 401 is NOT returned, chain is invoked.
        verify(chain).doFilter(request, res);
        assertNull(org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication());
    }

    @Test
    void ownerHealthPathIsPublicEvenWithoutToken() throws Exception {
        MockHttpServletRequest request = req("/api/owner/health", null);
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, res, chain);

        verify(chain).doFilter(request, res);
        assertEquals(200, res.getStatus());
    }
}
