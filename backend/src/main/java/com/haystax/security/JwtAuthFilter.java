package com.haystax.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Reads {@code Authorization: Bearer <Supabase JWT>} and authenticates the caller
 * by validating the token via {@link JwtService} (decision D-JWT).
 * <p>
 * Scope: the owner slice's private paths ({@code /api/owner/**} except the public
 * {@code /api/owner/health}) require a valid token — missing/invalid tokens get a
 * {@code 401} with the shared OpenAPI {@code ErrorResponse} body. All other paths
 * keep the previous passive behaviour: a valid token, when present, still populates
 * the security context (so other slices can reuse it), and an invalid one is
 * silently ignored — nothing is broken for discovery/admin/engagement.
 * <p>
 * The filter only ever puts the JWT {@code sub} in the context, never roles —
 * roles are always resolved from {@code public.profiles} (decision D-ROLES).
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Request attribute holding the validated JWT claims (subject + email). */
    public static final String CLAIMS_ATTR = "haystax.jwt.claims";

    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
        this.jdbcTemplate = null;
    }

    @Autowired
    public JwtAuthFilter(JwtService jwtService, JdbcTemplate jdbcTemplate) {
        this.jwtService = jwtService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String path = request.getRequestURI();
        boolean ownerPath = path.startsWith("/api/owner/")
                && !path.startsWith("/api/owner/health");

        String token = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7).trim()
                : null;

        if (ownerPath) {
            Optional<JwtService.JwtClaims> claims =
                    token == null ? Optional.empty() : jwtService.extractClaims(token);
            if (claims.isEmpty()) {
                writeError(response, HttpStatus.UNAUTHORIZED, request);
                return;
            }
            JwtService.JwtClaims c = claims.get();
            request.setAttribute(CLAIMS_ATTR, c);
            setAuthentication(c, request);
            filterChain.doFilter(request, response);
            return;
        }

        // Non-owner paths: passive — a valid token still authenticates, an
        // invalid one is ignored (unchanged behaviour for the other slices).
        if (token != null) {
            jwtService.extractClaims(token).ifPresent(claims -> {
                request.setAttribute(CLAIMS_ATTR, claims);
                setAuthentication(claims, request);
            });
        }
        filterChain.doFilter(request, response);
    }

    private void setAuthentication(JwtService.JwtClaims claims, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        boolean isOwner = claims.isOwner();
        boolean isAdmin = claims.isAdmin();
        String path = request.getRequestURI();
        if (path.startsWith("/api/admin/") || path.startsWith("/api/engagement/")) {
            ProfileRoles roles = rolesFromProfiles(claims.subject());
            if (roles == null) {
                SecurityContextHolder.clearContext();
                return;
            }
            isOwner = roles.isOwner();
            isAdmin = roles.isAdmin();
        }
        if (isOwner) {
            authorities.add(new SimpleGrantedAuthority("OWNER"));
        }
        if (isAdmin) {
            authorities.add(new SimpleGrantedAuthority("ADMIN"));
        }
        authorities.add(new SimpleGrantedAuthority("USER"));

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(claims.subject(), null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private ProfileRoles rolesFromProfiles(String subject) {
        if (jdbcTemplate == null) return null;
        try {
            List<ProfileRoles> roles = jdbcTemplate.query(
                    "select is_owner, is_admin from public.profiles where id = ?",
                    (resultSet, rowNumber) -> new ProfileRoles(
                            resultSet.getBoolean("is_owner"), resultSet.getBoolean("is_admin")),
                    java.util.UUID.fromString(subject));
            return roles.isEmpty() ? null : roles.get(0);
        } catch (org.springframework.dao.DataAccessException ex) {
            return null;
        }
    }

    private record ProfileRoles(boolean isOwner, boolean isAdmin) { }

    private void writeError(HttpServletResponse response, HttpStatus status,
                            HttpServletRequest request) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", "Missing or invalid token");
        body.put("path", request.getRequestURI());
        MAPPER.writeValue(response.getWriter(), body);
    }
}
