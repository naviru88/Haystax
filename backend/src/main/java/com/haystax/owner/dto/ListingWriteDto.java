package com.haystax.owner.dto;

import tools.jackson.databind.annotation.JsonNaming;
import tools.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * {@code POST/PUT /api/owner/listings} body — OpenAPI {@code ListingWriteRequest}.
 * <p>
 * All fields mandatory except {@code gender_policy} (team business answer) and
 * {@code address_line_2} / {@code district} / {@code location_label} / {@code location}.
 * {@code owner_id} is never in the request — the server/token supplies it
 * (AGENTS.md hard rule 5).
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ListingWriteDto(
        @NotBlank @Size(min = 5, max = 160) String title,
        @NotBlank String description,
        @NotBlank String addressLine1,
        String addressLine2,
        @NotBlank String city,
        String district,
        String locationLabel,
        LocationDto location,
        @NotNull @DecimalMin("0.0") BigDecimal priceAmount,
        String currencyCode,
        GenderPolicy genderPolicy,
        @NotNull @Min(1) Integer totalSlots,
        @NotNull @Min(0) Integer availableSlots,
        List<UUID> amenityIds,
        List<ListingRuleWriteDto> rules
) {
}