package com.haystax.owner.util;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Resolves the authenticated caller's id (the Supabase {@code auth.users} uuid,
 * i.e. the JWT {@code sub}) from the Spring Security context.
 * <p>
 * The JWT filter only ever sets a subject here — never roles — so roles are
 * always resolved from {@code public.profiles} (decision D-ROLES).
 */
@Component
public class CurrentUser {

    public UUID id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid subject");
        }
    }
}
