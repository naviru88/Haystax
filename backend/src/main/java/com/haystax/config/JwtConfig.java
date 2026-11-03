package com.haystax.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * JWT verification settings (decision D-JWT).
 * <p>
 * Modern Supabase projects sign access tokens with an asymmetric key (ES256) and publish
 * the public half at {@code {project-url}/auth/v1/.well-known/jwks.json}; the legacy
 * shared-secret mode uses {@link #secret}. Both are supported by {@code JwtService}.
 * <p>
 * {@code project-url} is normally supplied by {@code SUPABASE_URL} in {@code backend/.env};
 * {@code jwks-url} overrides the derived endpoint (useful for local/staging proxies).
 */
@Configuration
@ConfigurationProperties(prefix = "haystax.jwt")
public class JwtConfig {

    private String issuer = "haystax";

    /** Legacy HS256 shared secret. Ignored when the token header says ES256/RS256. */
    private String secret = "dev-only-secret-change-in-production";

    /** Supabase project URL, e.g. https://<ref>.supabase.co — used to derive the JWKS URL. */
    private String projectUrl = "";

    /** Explicit JWKS endpoint; wins over {@link #projectUrl} when set. */
    private String jwksUrl = "";

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getProjectUrl() {
        return projectUrl;
    }

    public void setProjectUrl(String projectUrl) {
        this.projectUrl = projectUrl;
    }

    public String getJwksUrl() {
        return jwksUrl;
    }

    public void setJwksUrl(String jwksUrl) {
        this.jwksUrl = jwksUrl;
    }
}
