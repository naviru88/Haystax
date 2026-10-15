package com.haystax.owner.dto;

import tools.jackson.databind.annotation.JsonNaming;
import tools.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * One rule of a listing — OpenAPI {@code ListingRuleResponse}.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ListingRuleDto(
        UUID id,
        @NotBlank String ruleCode,
        @NotBlank String label,
        @NotNull Boolean isAllowed,
        String notes
) {
}