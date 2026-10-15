package com.haystax.owner.dto;

import tools.jackson.databind.annotation.JsonNaming;
import tools.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Listing photo — OpenAPI {@code ListingPhotoResponse}.
 * <p>
 * The DB stores {@code storage_path} ({@code {listing_id}/{file}} in the private
 * {@code listing-photos} bucket) — never a public URL. {@code is_approved} is the
 * moderation flag, display-only for the owner (admin slice enforces).
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ListingPhotoDto(
        UUID id,
        UUID listingId,
        @NotBlank String storagePath,
        String altText,
        int sortOrder,
        boolean isPrimary,
        boolean isApproved,
        OffsetDateTime createdAt
) {
}