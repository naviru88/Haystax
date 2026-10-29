package com.haystax.engagement;

import com.haystax.engagement.auth.CurrentUser;
import com.haystax.engagement.auth.MockAuthFilter;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MockAuthFilterTest {
    private final UUID userId = UUID.randomUUID();

    @AfterEach
    void clearContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsEngagementRequestWithoutHeaders() throws Exception {
        CurrentUser currentUser = new CurrentUser();
        MockAuthFilter filter = new MockAuthFilter(currentUser);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/engagement/messages");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test
    void authenticatesEngagementRequestWithHeaders() throws Exception {
        CurrentUser currentUser = new CurrentUser();
        MockAuthFilter filter = new MockAuthFilter(currentUser);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/engagement/messages");
        request.addHeader("X-Mock-User-Id", userId.toString());
        request.addHeader("X-Mock-Role", "TENANT");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertEquals(userId, currentUser.getId());
        assertEquals("TENANT", currentUser.getRole());
        assertTrue(org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().isAuthenticated());
    }
}
