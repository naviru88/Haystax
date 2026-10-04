package com.haystax.owner.dto;

import com.fasterxml.jackson.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * Amenity for the listing editor — OpenAPI {@code AmenityResponse}.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AmenityDto(
        UUID id,
        @NotBlank String code,
        @NotBlank String name,
        String description,
        boolean isActive,
        int sortOrder
) {
}