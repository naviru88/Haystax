package com.haystax.owner.controller;

import com.haystax.owner.dto.AmenityDto;
import com.haystax.owner.dto.ListingDto;
import com.haystax.owner.dto.ListingWriteDto;
import com.haystax.owner.service.AmenityService;
import com.haystax.owner.service.ListingWriteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Listing write operations and amenities for the owner slice
 * ({@code docs/api-contracts/openapi-owner.yaml}).
 * <p>
 * {@code owner_id} is always resolved from the JWT/server, never from the body.
 */
@RestController
@RequestMapping("/api/owner")
public class ListingWriteController {

    private final ListingWriteService listingWriteService;
    private final AmenityService amenityService;

    public ListingWriteController(ListingWriteService listingWriteService,
                                  AmenityService amenityService) {
        this.listingWriteService = listingWriteService;
        this.amenityService = amenityService;
    }

    @GetMapping("/listings")
    public List<ListingDto> listListings() {
        return listingWriteService.listOwn();
    }

    @PostMapping("/listings")
    public ResponseEntity<ListingDto> createListing(
            @Valid @RequestBody ListingWriteDto dto) {
        ListingDto created = listingWriteService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/listings/{id}")
    public ListingDto getListing(@PathVariable UUID id) {
        return listingWriteService.get(id);
    }

    @PutMapping("/listings/{id}")
    public ListingDto updateListing(@PathVariable UUID id,
                                    @Valid @RequestBody ListingWriteDto dto) {
        return listingWriteService.update(id, dto);
    }

    @PostMapping("/listings/{id}/publish")
    public ListingDto publishListing(@PathVariable UUID id) {
        return listingWriteService.publish(id);
    }

    @GetMapping("/amenities")
    public List<AmenityDto> listAmenities() {
        return amenityService.listActive();
    }

    // Photo endpoints remain 501 stubs until W2-C3.
    @PostMapping("/listings/{id}/photos")
    public ResponseEntity<com.haystax.owner.dto.ErrorResponseDto> uploadPhotoPlaceholder(
            @PathVariable UUID id, jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(com.haystax.owner.dto.ErrorResponseDto.notImplemented(request.getRequestURI()));
    }

    @DeleteMapping("/listings/{id}/photos/{photoId}")
    public ResponseEntity<com.haystax.owner.dto.ErrorResponseDto> deletePhotoPlaceholder(
            @PathVariable UUID id, @PathVariable UUID photoId,
            jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(com.haystax.owner.dto.ErrorResponseDto.notImplemented(request.getRequestURI()));
    }
}
