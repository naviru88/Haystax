package com.haystax.owner.dto;

import com.fasterxml.jackson.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.Size;

/**
 * {@code PUT /api/owner/profile} body — OpenAPI {@code ProfileUpdateRequest}.
 * <p>
 * Only {@code display_name} / {@code phone_number} / {@code avatar_path} may be
 * edited; role flags are never accepted here (ignored server-side Week 2+).
 * Contract requires at least one field present ({@code minProperties: 1}) —
 * enforced with business validation from Week 2.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ProfileUpdateDto(
        @Size(min = 2, max = 120) String displayName,
        String phoneNumber,
        String avatarPath
) {
}