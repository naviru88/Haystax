package com.haystax.owner.dto;

import tools.jackson.databind.annotation.JsonNaming;
import tools.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * {@code GET /api/owner/auth/me} response — OpenAPI {@code MeResponse}.
 * <p>
 * Role flags are resolved server-side from {@code public.profiles} (via the token
 * subject), never from client claims. {@code email} comes from Supabase
 * {@code auth.users} (read-only here).
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record MeDto(
        UUID id,
        String email,
        @Size(min = 2, max = 120) String displayName,
        String phoneNumber,
        String avatarPath,
        boolean isOwner,
        boolean isAdmin,
        boolean isSuspended,
        String suspensionReason
) {
}