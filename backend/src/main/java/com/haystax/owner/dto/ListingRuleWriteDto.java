package com.haystax.owner.dto;

import tools.jackson.databind.annotation.JsonNaming;
import tools.jackson.databind.PropertyNamingStrategies;
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