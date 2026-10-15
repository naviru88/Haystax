package com.haystax.owner.controller;

import com.haystax.owner.dto.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Week 1 (C2) skeleton stub.
 * <p>
 * OpenAPI: {@code GET /api/owner/profile}, {@code PUT /api/owner/profile}.
 * Role flags (is_owner / is_admin / is_suspended) are never editable through
 * these endpoints. Implementation lands Week 2+.
 */
@RestController
@RequestMapping("/api/owner/profile")
public class OwnerProfileController {

    @GetMapping
    public ResponseEntity<ErrorResponseDto> getProfile(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ErrorResponseDto.notImplemented(request.getRequestURI()));
    }

    @PutMapping
    public ResponseEntity<ErrorResponseDto> updateProfile(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ErrorResponseDto.notImplemented(request.getRequestURI()));
    }
}