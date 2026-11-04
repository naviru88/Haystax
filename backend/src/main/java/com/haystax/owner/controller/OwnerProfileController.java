package com.haystax.owner.controller;

import com.haystax.owner.dto.MeDto;
import com.haystax.owner.dto.OwnerProfileDto;
import com.haystax.owner.dto.ProfileUpdateDto;
import com.haystax.owner.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET/PUT /api/owner/profile} and {@code POST /api/owner/profile/become-owner}
 * (CC-1). Role flags are never editable here — they are resolved from the DB
 * (decision D-ROLES).
 */
@RestController
@RequestMapping("/api/owner/profile")
public class OwnerProfileController {

    private final AuthService authService;

    public OwnerProfileController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public OwnerProfileDto getProfile() {
        return authService.getProfile();
    }

    @PutMapping
    public OwnerProfileDto updateProfile(@Valid @RequestBody ProfileUpdateDto dto) {
        return authService.updateProfile(dto);
    }

    @PostMapping("/become-owner")
    public MeDto becomeOwner(HttpServletRequest request) {
        return authService.becomeOwner(request);
    }
}
