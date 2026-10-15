package com.haystax.owner.service;

import com.haystax.owner.dto.ErrorResponseDto.FieldErrorDto;
import com.haystax.owner.dto.GenderPolicy;
import com.haystax.owner.dto.ListingWriteDto;
import com.haystax.owner.dto.LocationDto;
import com.haystax.owner.entity.ProfileEntity;
import com.haystax.owner.exception.OwnerApiException;
import com.haystax.owner.mapper.ListingMapper;
import com.haystax.owner.repository.ListingWriteRepository;
import com.haystax.owner.repository.ProfileRepository;
import com.haystax.owner.util.CurrentUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * W2-C2 service tests for listing create / get / update / publish.
 * Repository + profile repo are mocked (no DB), matching the repo's test style.
 */
class ListingWriteServiceTest {

    @Mock
    private ListingWriteRepository repository;
    @Mock
    private ProfileRepository profileRepository;

    private ListingWriteService service;
    private UUID ownerId;
    private UUID otherOwnerId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        CurrentUser currentUser = new CurrentUser();
        service = new ListingWriteService(currentUser, profileRepository, repository,
                new ListingMapper());
        ownerId = UUID.randomUUID();
        otherOwnerId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(ownerId.toString(), null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ProfileEntity ownerProfile(boolean owner, boolean suspended) {
        ProfileEntity p = new ProfileEntity();
        p.setId(ownerId);
        p.setDisplayName("Owner");
        p.setOwner(owner);
        p.setSuspended(suspended);
        return p;
    }

    private ListingWriteDto validDto() {
        return new ListingWriteDto(
                "Sunny Boarding House", "A lovely place to stay.",
                "12 Lake Road", null, "Kandy", "Kandy", "Near Temple",
                new LocationDto(7.2906, 80.6337),
                new BigDecimal("15000.00"), "LKR", GenderPolicy.any,
                5, 3, List.of(), List.of());
    }

    private ListingWriteRepository.ListingRow row(UUID id, UUID ow, boolean removed) {
        return new ListingWriteRepository.ListingRow(
                id, ow, "Sunny Boarding House", "A lovely place to stay.",
                "12 Lake Road", null, "Kandy", "Kandy", "Near Temple",
                new LocationDto(7.2906, 80.6337),
                new BigDecimal("15000.00"), "LKR", GenderPolicy.any, 5, 3,
                removed ? com.haystax.owner.dto.ListingStatus.removed
                        : com.haystax.owner.dto.ListingStatus.draft,
                null, null, null, OffsetDateTime.now(), OffsetDateTime.now());
    }

    // ---- list ----

    @Test
    void listReturnsOnlyOwnListings() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        when(repository.findOwnedAll(ownerId)).thenReturn(List.of(row(UUID.randomUUID(), ownerId, false)));

        var result = service.listOwn();
        assertEquals(1, result.size());
        assertEquals(ownerId, result.get(0).ownerId());
    }

    @Test
    void nonOwnerCannotList() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(false, false)));
        assertThrows(OwnerApiException.class, service::listOwn);
    }

    @Test
    void suspendedOwnerCanStillReadListings() {
        // D-SUSPENDED: may read /listings; only writes are blocked.
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, true)));
        when(repository.findOwnedAll(ownerId)).thenReturn(List.of(row(UUID.randomUUID(), ownerId, false)));

        var result = service.listOwn();
        assertEquals(1, result.size());
    }

    @Test
    void suspendedOwnerCannotCreate() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, true)));
        assertThrows(OwnerApiException.class, () -> service.create(validDto()));
    }

    // ---- create ----

    @Test
    void createIgnoresClientOwnerIdAndStatus() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        UUID newId = UUID.randomUUID();
        when(repository.insertListing(eq(ownerId), any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), anyInt(), anyInt())).thenReturn(newId);
        when(repository.findOwned(newId, ownerId)).thenReturn(Optional.of(row(newId, ownerId, false)));

        ListingWriteDto dto = validDto();
        var created = service.create(dto);

        assertNotNull(created);
        assertEquals(newId, created.id());
        // The client had no owner_id field to send; status is always draft server-side.
        assertEquals(com.haystax.owner.dto.ListingStatus.draft, created.status());
        verify(repository).insertListing(eq(ownerId), any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    @Test
    void createByNonOwnerIsForbidden() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(false, false)));
        assertThrows(OwnerApiException.class, () -> service.create(validDto()));
    }

    @Test
    void createBySuspendedOwnerIsForbidden() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, true)));
        assertThrows(OwnerApiException.class, () -> service.create(validDto()));
    }

    @Test
    void createWithAvailableSlotsAboveTotalIs422() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        ListingWriteDto dto = validDto();
        dto = new ListingWriteDto(dto.title(), dto.description(), dto.addressLine1(),
                dto.addressLine2(), dto.city(), dto.district(), dto.locationLabel(),
                dto.location(), dto.priceAmount(), dto.currencyCode(), dto.genderPolicy(),
                5, 9, dto.amenityIds(), dto.rules()); // 9 > 5
        ListingWriteDto bad = dto;
        OwnerApiException ex = assertThrows(OwnerApiException.class, () -> service.create(bad));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream()
                .anyMatch(fe -> fe.field().equals("available_slots")));
    }

    @Test
    void createWithFourCharTitleIs422() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        ListingWriteDto dto = validDto();
        dto = new ListingWriteDto("Four", dto.description(), dto.addressLine1(),
                dto.addressLine2(), dto.city(), dto.district(), dto.locationLabel(),
                dto.location(), dto.priceAmount(), dto.currencyCode(), dto.genderPolicy(),
                dto.totalSlots(), dto.availableSlots(), dto.amenityIds(), dto.rules());
        ListingWriteDto bad = dto;
        OwnerApiException ex = assertThrows(OwnerApiException.class, () -> service.create(bad));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream().anyMatch(fe -> fe.field().equals("title")));
    }

    @Test
    void createWithoutLocationIs422() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        ListingWriteDto dto = validDto();
        ListingWriteDto bad = new ListingWriteDto(dto.title(), dto.description(), dto.addressLine1(),
                dto.addressLine2(), dto.city(), dto.district(), dto.locationLabel(),
                null, dto.priceAmount(), dto.currencyCode(), dto.genderPolicy(),
                dto.totalSlots(), dto.availableSlots(), dto.amenityIds(), dto.rules());
        OwnerApiException ex = assertThrows(OwnerApiException.class, () -> service.create(bad));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream().anyMatch(fe -> fe.field().equals("location")));
    }

    @Test
    void createWithUnknownAmenityIs422() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        when(repository.amenityExistsAndActive(any())).thenReturn(false);
        ListingWriteDto dto = validDto();
        dto = new ListingWriteDto(dto.title(), dto.description(), dto.addressLine1(),
                dto.addressLine2(), dto.city(), dto.district(), dto.locationLabel(),
                dto.location(), dto.priceAmount(), dto.currencyCode(), dto.genderPolicy(),
                dto.totalSlots(), dto.availableSlots(),
                List.of(UUID.randomUUID()), dto.rules());
        ListingWriteDto bad = dto;
        OwnerApiException ex = assertThrows(OwnerApiException.class, () -> service.create(bad));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream()
                .anyMatch(fe -> fe.field().equals("amenity_ids")));
    }

    // ---- get / update / publish ----

    @Test
    void getOfAnotherOwnersListingIs404AndChangesNothing() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        when(repository.findOwned(any(), eq(ownerId))).thenReturn(Optional.empty());

        UUID foreignId = UUID.randomUUID();
        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.get(foreignId));
        assertEquals(404, ex.status().value());
        verify(repository, never()).updateListing(any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    @Test
    void updateOfRemovedListingIs409() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        UUID id = UUID.randomUUID();
        when(repository.findOwned(id, ownerId)).thenReturn(Optional.of(row(id, ownerId, true)));

        OwnerApiException ex = assertThrows(OwnerApiException.class,
                () -> service.update(id, validDto()));
        assertEquals(409, ex.status().value());
        verify(repository, never()).updateListing(any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    @Test
    void publishFromPublishedIs409() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        UUID id = UUID.randomUUID();
        var published = new ListingWriteRepository.ListingRow(
                id, ownerId, "Sunny Boarding House", "desc", "12 Lake Road", null,
                "Kandy", "Kandy", null, new LocationDto(7.29, 80.63),
                new BigDecimal("15000"), "LKR", GenderPolicy.any, 5, 3,
                com.haystax.owner.dto.ListingStatus.published, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now());
        when(repository.findOwned(id, ownerId)).thenReturn(Optional.of(published));

        OwnerApiException ex = assertThrows(OwnerApiException.class, () -> service.publish(id));
        assertEquals(409, ex.status().value());
    }

    @Test
    void publishWithNoPhotosIs422ListingMissingItems() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        UUID id = UUID.randomUUID();
        when(repository.findOwned(id, ownerId)).thenReturn(Optional.of(row(id, ownerId, false)));
        when(repository.findAmenityIds(id)).thenReturn(List.of());
        when(repository.countPhotos(id)).thenReturn(0);

        OwnerApiException ex = assertThrows(OwnerApiException.class, () -> service.publish(id));
        assertEquals(422, ex.status().value());
        assertTrue(ex.fieldErrors().stream().anyMatch(fe -> fe.field().equals("photos")));
        assertTrue(ex.fieldErrors().stream().anyMatch(fe -> fe.field().equals("amenities")));
    }

    @Test
    void publishSuccessMovesToPendingReview() {
        when(profileRepository.findById(ownerId)).thenReturn(Optional.of(ownerProfile(true, false)));
        UUID id = UUID.randomUUID();
        when(repository.findOwned(id, ownerId)).thenReturn(Optional.of(row(id, ownerId, false)));
        when(repository.findAmenityIds(id)).thenReturn(List.of(UUID.randomUUID()));
        when(repository.countPhotos(id)).thenReturn(1);
        when(repository.updateStatus(id, ownerId, com.haystax.owner.dto.ListingStatus.pending_review))
                .thenReturn(true);
        var pending = new ListingWriteRepository.ListingRow(
                id, ownerId, "Sunny Boarding House", "A lovely place to stay.",
                "12 Lake Road", null, "Kandy", "Kandy", "Near Temple",
                new LocationDto(7.2906, 80.6337),
                new BigDecimal("15000.00"), "LKR", GenderPolicy.any, 5, 3,
                com.haystax.owner.dto.ListingStatus.pending_review, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now());
        when(repository.findOwned(id, ownerId)).thenReturn(Optional.of(row(id, ownerId, false)),
                Optional.of(pending));

        var result = service.publish(id);
        assertEquals(com.haystax.owner.dto.ListingStatus.pending_review, result.status());
    }
}
