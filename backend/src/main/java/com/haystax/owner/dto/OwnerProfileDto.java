package com.haystax.owner.dto;

import tools.jackson.databind.annotation.JsonNaming;
import tools.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * {@code GET /api/owner/profile} response — OpenAPI {@code OwnerProfileResponse}.
 * <p>
 * Role flags ({@code is_owner}/{@code is_admin}/{@code is_suspended}) are read-only
 * here; they can never be changed through the update endpoint.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record OwnerProfileDto(
        UUID id,
        @Size(min = 2, max = 120) String displayName,
        String phoneNumber,
        String avatarPath,
        OffsetDateTime lastSeenAt,
        boolean isOwner,
        boolean isAdmin,
        boolean isSuspended
) {
}