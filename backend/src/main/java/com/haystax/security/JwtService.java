package com.haystax.security;

import com.haystax.config.JwtConfig;
import org.springframework.stereotype.Service;

import java.util.Optional;

// STUB — to be replaced with Anoj's implementation in Week 4.
@Service
public class JwtService {

    private final JwtConfig config;

    public JwtService(JwtConfig config) {
        this.config = config;
    }

    public String getIssuer() {
        return config.getIssuer();
    }

    public Optional<String> extractSubject(String token) {
        return Optional.empty();
    }

    public Optional<JwtClaims> extractClaims(String token) {
        return Optional.empty();
    }

    public record JwtClaims(String subject, boolean isOwner, boolean isAdmin) {}
}
