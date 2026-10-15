package com.haystax.owner.controller;

import com.haystax.owner.dto.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Week 1 (C2) skeleton stub.
 * <p>
 * OpenAPI: {@code GET /api/owner/auth/me} — resolves the caller from the Supabase
 * JWT subject and returns profile + role flags from {@code public.profiles}.
 * How Spring verifies the Supabase JWT (shared secret vs JWKS) is undecided
 * ({@code x-todo} in docs/api-contracts/openapi-owner.yaml) — implemented Week 2+.
 */
@RestController
@RequestMapping("/api/owner/auth")
public class OwnerAuthController {

    @GetMapping("/me")
    public ResponseEntity<ErrorResponseDto> me(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ErrorResponseDto.notImplemented(request.getRequestURI()));
    }
}