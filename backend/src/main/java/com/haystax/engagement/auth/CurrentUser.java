package com.haystax.engagement.auth;

import org.springframework.web.context.annotation.RequestScope;
import org.springframework.stereotype.Component;

import java.util.UUID;

@RequestScope
@Component
public class CurrentUser {
    private UUID id;
    private String role;

    public UUID getId() { return id; }
    public String getRole() { return role; }
    public void set(UUID id, String role) {
        this.id = id;
        this.role = role;
    }
}
