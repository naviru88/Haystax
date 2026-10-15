package com.haystax.owner.controller;

import com.haystax.owner.dto.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Week 1 (C2) skeleton stub for every listing / photo / amenity operation in the
 * C1 OpenAPI (docs/api-contracts/openapi-owner.yaml).
 * <p>
 * All endpoints return {@code 501 Not Implemented} with the shared error shape
 * until Weeks 2–3 implement them. Owner_id is always resolved from the JWT/server,
 * never from the request body (AGENTS.md section 0 hard rule 5).
 */
@RestController
@RequestMapping("/api/owner")
public class ListingWriteController {

    private ResponseEntity<ErrorResponseDto> stub(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ErrorResponseDto.notImplemented(request.getRequestURI()));
    }

    @GetMapping("/listings")
    public ResponseEntity<ErrorResponseDto> listListings(HttpServletRequest request) {
        return stub(request);
    }

    @PostMapping("/listings")
    public ResponseEntity<ErrorResponseDto> createListing(HttpServletRequest request) {
        return stub(request);
    }

    @GetMapping("/listings/{id}")
    public ResponseEntity<ErrorResponseDto> getListing(HttpServletRequest request) {
        return stub(request);
    }

    @PutMapping("/listings/{id}")
    public ResponseEntity<ErrorResponseDto> updateListing(HttpServletRequest request) {
        return stub(request);
    }

    @PostMapping("/listings/{id}/publish")
    public ResponseEntity<ErrorResponseDto> publishListing(HttpServletRequest request) {
        return stub(request);
    }

    @PostMapping("/listings/{id}/photos")
    public ResponseEntity<ErrorResponseDto> uploadPhoto(HttpServletRequest request) {
        return stub(request);
    }

    @DeleteMapping("/listings/{id}/photos/{photoId}")
    public ResponseEntity<ErrorResponseDto> deletePhoto(HttpServletRequest request) {
        return stub(request);
    }

    @GetMapping("/amenities")
    public ResponseEntity<ErrorResponseDto> listAmenities(HttpServletRequest request) {
        return stub(request);
    }
}