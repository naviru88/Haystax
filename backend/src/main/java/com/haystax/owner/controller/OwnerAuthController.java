package com.haystax.owner.controller;

import com.haystax.owner.dto.MeDto;
import com.haystax.owner.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/owner/auth/me} — resolves the caller from the validated Supabase
 * JWT subject and returns profile + role flags from {@code public.profiles}
 * (decision D-ROLES: roles never come from token claims).
 */
@RestController
@RequestMapping("/api/owner/auth")
public class OwnerAuthController {

    private final AuthService authService;

    public OwnerAuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public MeDto me(HttpServletRequest request) {
        return authService.me(request);
    }
}
