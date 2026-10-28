package com.haystax.engagement.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "engagement.mock-auth", havingValue = "true", matchIfMissing = false)
public class MockAuthFilter extends OncePerRequestFilter {
    private final CurrentUser currentUser;

    public MockAuthFilter(CurrentUser currentUser) {
        this.currentUser = currentUser;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/engagement/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String userHeader = request.getHeader("X-Mock-User-Id");
        String role = request.getHeader("X-Mock-Role");
        if (userHeader == null || role == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing mock authentication headers");
            return;
        }

        try {
            UUID userId = UUID.fromString(userHeader);
            String normalizedRole = role.toUpperCase();
            if (!List.of("TENANT", "OWNER", "ADMIN").contains(normalizedRole)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid mock role");
                return;
            }
            currentUser.set(userId, normalizedRole);
            var authentication = new UsernamePasswordAuthenticationToken(
                    userId.toString(), null, List.of(new SimpleGrantedAuthority(normalizedRole)));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (IllegalArgumentException ex) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid mock user id");
        }
    }
}
