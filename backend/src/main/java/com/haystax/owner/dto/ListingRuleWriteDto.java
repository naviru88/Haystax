package com.haystax.owner.dto;

import com.fasterxml.jackson.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * One rule inside a listing write — OpenAPI {@code ListingRuleWrite}.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ListingRuleWriteDto(
        @NotBlank String ruleCode,
        @NotBlank String label,
        @NotNull Boolean isAllowed,
        String notes
) {
}