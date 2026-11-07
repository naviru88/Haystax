package com.haystax.owner.service;

import com.haystax.owner.dto.MeDto;
import com.haystax.owner.dto.OwnerProfileDto;
import com.haystax.owner.dto.ProfileUpdateDto;
import com.haystax.owner.entity.ProfileEntity;
import com.haystax.owner.exception.OwnerApiException;
import com.haystax.owner.repository.ProfileRepository;
import com.haystax.owner.util.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * W2-C1 service tests for {@code /me}, profile get/update, become-owner.
 * Repositories are mocked (no DB), matching the repo's existing test style.
 */
class AuthServiceTest {

    @Mock
    private ProfileRepository profileRepository;

    private AuthService authService;
    private UUID userId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        CurrentUser currentUser = new CurrentUser();
        authService = new AuthService(currentUser, profileRepository);
        userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId.toString(), null,
                        List.of()));
    }

    private ProfileEntity profile(boolean owner, boolean admin, boolean suspended) {
        ProfileEntity p = new ProfileEntity();
        p.setId(userId);
        p.setDisplayName("Anoj Perera");
        p.setPhoneNumber("+94771234567");
        p.setOwner(owner);
        p.setAdmin(admin);
        p.setSuspended(suspended);
        p.setSuspensionReason(suspended ? "dev test" : null);
        p.setCreatedAt(OffsetDateTime.now());
        p.setUpdatedAt(OffsetDateTime.now());
        return p;
    }

    @Test
    void meReturnsFlagsFromProfileEvenIfTokenHasConflictingOwnerClaim() {
        ProfileEntity p = profile(true, false, false);
        when(profileRepository.findById(userId)).thenReturn(Optional.of(p));

        // The token's is_owner claim is irrelevant: it is never read. The flags
        // come from the profile row.
        MeDto me = authService.me(mock(jakarta.servlet.http.HttpServletRequest.class));
        assertTrue(me.isOwner());
        assertFalse(me.isAdmin());
        assertFalse(me.isSuspended());
    }

    @Test
    void meWithoutProfileRowIsForbidden() {
        when(profileRepository.findById(userId)).thenReturn(Optional.empty());
        assertThrows(OwnerApiException.class,
                () -> authService.me(mock(jakarta.servlet.http.HttpServletRequest.class)));
    }

    @Test
    void updateProfileIgnoresRoleFlagsBecauseTheyAreNotInTheBody() {
        ProfileEntity p = profile(false, false, false);
        when(profileRepository.findById(userId)).thenReturn(Optional.of(p));
        when(profileRepository.save(any(ProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        // ProfileUpdateDto has no role fields at all — they can never be set here.
        OwnerProfileDto updated = authService.updateProfile(
                new ProfileUpdateDto("New Name", "+94770000000", null));

        assertEquals("New Name", updated.displayName());
        assertEquals("+94770000000", updated.phoneNumber());
        assertFalse(updated.isOwner());
        assertFalse(updated.isAdmin());
    }

    @Test
    void updateProfileWithEmptyBodyRejected() {
        ProfileEntity p = profile(false, false, false);
        when(profileRepository.findById(userId)).thenReturn(Optional.of(p));
        assertThrows(OwnerApiException.class,
                () -> authService.updateProfile(new ProfileUpdateDto(null, null, null)));
    }

    @Test
    void suspendedUserCannotUpdateButCanRead() {
        ProfileEntity p = profile(true, false, true);
        when(profileRepository.findById(userId)).thenReturn(Optional.of(p));

        // read allowed
        OwnerProfileDto got = authService.getProfile();
        assertTrue(got.isSuspended());

        // write forbidden
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> authService.updateProfile(new ProfileUpdateDto("X", null, null)));
        assertEquals(403, ex.status().value());
    }

    @Test
    void becomeOwnerTwiceReturns200BothTimes() {
        ProfileEntity p = profile(false, false, false);
        when(profileRepository.findById(userId)).thenReturn(Optional.of(p));
        when(profileRepository.save(any(ProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        MeDto first = authService.becomeOwner(mock(jakarta.servlet.http.HttpServletRequest.class));
        assertTrue(first.isOwner());

        // Second call: already owner -> idempotent, still 200.
        MeDto second = authService.becomeOwner(mock(jakarta.servlet.http.HttpServletRequest.class));
        assertTrue(second.isOwner());
        assertTrue(p.isOwner());
    }

    @Test
    void suspendedUserCannotBecomeOwner() {
        ProfileEntity p = profile(false, false, true);
        when(profileRepository.findById(userId)).thenReturn(Optional.of(p));
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> authService.becomeOwner(mock(jakarta.servlet.http.HttpServletRequest.class)));
        assertEquals(403, ex.status().value());
    }
}
