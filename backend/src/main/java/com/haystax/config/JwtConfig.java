package com.haystax.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

//Stub — used by the placeholder JwtService. Anoj's real implementation
@Configuration
@ConfigurationProperties(prefix = "haystax.jwt")
public class JwtConfig {

    private String issuer = "haystax";
    private String secret = "dev-only-secret-change-in-production";

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
}
