package com.haystax.owner.dto;

import com.fasterxml.jackson.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full listing as owned by the caller — OpenAPI {@code ListingResponse}.
 * Field names match the DB columns in snake_case on the wire.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ListingDto(
        UUID id,
        UUID ownerId,
        @NotBlank @Size(min = 5, max = 160) String title,
        @NotBlank String description,
        @NotBlank String addressLine1,
        String addressLine2,
        @NotBlank String city,
        String district,
        String locationLabel,
        LocationDto location,
        @NotNull @DecimalMin("0.0") BigDecimal priceAmount,
        @NotBlank String currencyCode,
        @NotNull GenderPolicy genderPolicy,
        @Min(1) int totalSlots,
        @Min(0) int availableSlots,
        @NotNull ListingStatus status,
        String moderationNote,
        OffsetDateTime publishedAt,
        OffsetDateTime removedAt,
        @NotNull OffsetDateTime createdAt,
        @NotNull OffsetDateTime updatedAt,
        List<ListingPhotoDto> photos,
        List<AmenityDto> amenities,
        List<ListingRuleDto> rules
) {
}