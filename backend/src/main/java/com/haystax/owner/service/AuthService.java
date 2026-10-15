package com.haystax.owner.service;

import com.haystax.owner.dto.MeDto;
import com.haystax.owner.dto.OwnerProfileDto;
import com.haystax.owner.dto.ProfileUpdateDto;
import com.haystax.owner.entity.ProfileEntity;
import com.haystax.owner.exception.OwnerApiException;
import com.haystax.owner.repository.ProfileRepository;
import com.haystax.owner.util.CurrentUser;
import com.haystax.security.JwtAuthFilter;
import com.haystax.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Identity/role + profile service for the owner slice.
 * <p>
 * Roles ({@code is_owner}, {@code is_admin}, {@code is_suspended}) are ALWAYS
 * resolved from {@code public.profiles} by the JWT subject (decision D-ROLES),
 * never from token claims or request bodies.
 * <p>
 * D-SUSPENDED: a suspended account may read ({@code me}/{@code profile}) but all
 * writes are rejected with 403 "Account suspended".
 */
@Service
public class AuthService {

    private final CurrentUser currentUser;
    private final ProfileRepository profileRepository;

    public AuthService(CurrentUser currentUser, ProfileRepository profileRepository) {
        this.currentUser = currentUser;
        this.profileRepository = profileRepository;
    }

    /** {@code GET /api/owner/auth/me} — profile + role flags from the DB. */
    public MeDto me(HttpServletRequest request) {
        ProfileEntity p = requireProfile();
        return toMe(p, emailFrom(request));
    }

    /** {@code GET /api/owner/profile} — own profile details (read is always allowed). */
    public OwnerProfileDto getProfile() {
        return toOwnerProfile(requireProfile());
    }

    /** {@code PUT /api/owner/profile} — update only display_name / phone_number / avatar_path. */
    @Transactional
    public OwnerProfileDto updateProfile(ProfileUpdateDto dto) {
        ProfileEntity p = requireProfile();
        requireNotSuspended();

        if (dto.displayName() == null && dto.phoneNumber() == null && dto.avatarPath() == null) {
            throw new OwnerApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "At least one of display_name, phone_number or avatar_path is required.");
        }

        if (dto.displayName() != null) {
            p.setDisplayName(dto.displayName());
        }
        if (dto.phoneNumber() != null) {
            p.setPhoneNumber(dto.phoneNumber());
        }
        if (dto.avatarPath() != null) {
            p.setAvatarPath(dto.avatarPath());
        }
        return toOwnerProfile(profileRepository.save(p));
    }

    /** {@code POST /api/owner/profile/become-owner} (CC-1) — idempotent, never from client role flags. */
    @Transactional
    public MeDto becomeOwner(HttpServletRequest request) {
        ProfileEntity p = requireProfile();
        requireNotSuspended();

        if (!p.isOwner()) {
            p.setOwner(true);
            p = profileRepository.save(p);
        }
        return toMe(p, emailFrom(request));
    }

    // --- helpers ---

    private ProfileEntity requireProfile() {
        UUID id = currentUser.id();
        return profileRepository.findById(id)
                .orElseThrow(() -> new OwnerApiException(HttpStatus.FORBIDDEN,
                        "No profile found for this account."));
    }

    private void requireNotSuspended() {
        ProfileEntity p = requireProfile();
        if (p.isSuspended()) {
            throw new OwnerApiException(HttpStatus.FORBIDDEN, "Account suspended");
        }
    }

    private String emailFrom(HttpServletRequest request) {
        Object attr = request.getAttribute(JwtAuthFilter.CLAIMS_ATTR);
        if (attr instanceof JwtService.JwtClaims claims) {
            return claims.email();
        }
        return null;
    }

    private MeDto toMe(ProfileEntity p, String email) {
        return new MeDto(
                p.getId(),
                email,
                p.getDisplayName(),
                p.getPhoneNumber(),
                p.getAvatarPath(),
                p.isOwner(),
                p.isAdmin(),
                p.isSuspended(),
                p.getSuspensionReason());
    }

    private OwnerProfileDto toOwnerProfile(ProfileEntity p) {
        return new OwnerProfileDto(
                p.getId(),
                p.getDisplayName(),
                p.getPhoneNumber(),
                p.getAvatarPath(),
                p.getLastSeenAt(),
                p.isOwner(),
                p.isAdmin(),
                p.isSuspended());
    }
}
