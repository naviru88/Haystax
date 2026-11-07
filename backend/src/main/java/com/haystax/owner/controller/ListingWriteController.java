package com.haystax.owner.controller;

import com.haystax.owner.dto.AmenityDto;
import com.haystax.owner.dto.ListingDto;
import com.haystax.owner.dto.ListingPhotoDto;
import com.haystax.owner.dto.ListingWriteDto;
import com.haystax.owner.service.AmenityService;
import com.haystax.owner.service.ListingWriteService;
import com.haystax.owner.service.PhotoService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Listing write operations, photos and amenities for the owner slice
 * ({@code docs/api-contracts/openapi-owner.yaml}).
 * <p>
 * {@code owner_id} is always resolved from the JWT/server, never from the body.
 */
@RestController
@RequestMapping("/api/owner")
public class ListingWriteController {

    private final ListingWriteService listingWriteService;
    private final AmenityService amenityService;
    private final PhotoService photoService;

    public ListingWriteController(ListingWriteService listingWriteService,
                                  AmenityService amenityService,
                                  PhotoService photoService) {
        this.listingWriteService = listingWriteService;
        this.amenityService = amenityService;
        this.photoService = photoService;
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

    // ------------------------------------------------------------------
    // photos (W2-C3)
    // ------------------------------------------------------------------

    @PostMapping(value = "/listings/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ListingPhotoDto> uploadPhoto(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "is_primary", required = false) Boolean isPrimary,
            @RequestParam(value = "alt_text", required = false) String altText,
            @RequestParam(value = "sort_order", required = false) Integer sortOrder) {
        ListingPhotoDto created = photoService.upload(id, file, isPrimary, altText, sortOrder);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/listings/{id}/photos/{photoId}")
    public ResponseEntity<Void> deletePhoto(@PathVariable UUID id,
                                            @PathVariable UUID photoId) {
        photoService.delete(id, photoId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/listings/{id}/photos/{photoId}/content")
    public ResponseEntity<Resource> photoContent(@PathVariable UUID id,
                                                 @PathVariable UUID photoId) {
        PhotoService.PhotoContent content = photoService.content(id, photoId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.contentType())
                .body(content.resource());
    }
}
