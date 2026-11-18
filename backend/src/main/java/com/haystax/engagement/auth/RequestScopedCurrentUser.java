package com.haystax.engagement.auth;

import org.springframework.web.context.annotation.RequestScope;
import org.springframework.stereotype.Component;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

@RequestScope
@Component
public class RequestScopedCurrentUser {
    private UUID id;
    private String role;

    public UUID getId() {
        if (id != null) return id;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    public String getRole() {
        if (role != null) return role;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if ("ADMIN".equals(authority.getAuthority())) return "ADMIN";
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if ("OWNER".equals(authority.getAuthority())) return "OWNER";
        }
        return "TENANT";
    }
    public void set(UUID id, String role) {
        this.id = id;
        this.role = role;
    }
}
