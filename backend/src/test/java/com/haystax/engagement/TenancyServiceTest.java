package com.haystax.engagement;

import com.haystax.common.exception.BookingConflictException;
import com.haystax.engagement.adapter.ListingContractClient;
import com.haystax.engagement.auth.CurrentUser;
import com.haystax.engagement.dto.TenancyDto;
import com.haystax.engagement.entity.TenancyEntity;
import com.haystax.engagement.entity.TenancyRequestEntity;
import com.haystax.engagement.event.EngagementEventBus;
import com.haystax.engagement.repository.TenancyRepository;
import com.haystax.engagement.repository.TenancyRequestRepository;
import com.haystax.engagement.service.TenancyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TenancyServiceTest {
    private static final UUID TENANT = UUID.randomUUID();
    private static final UUID OWNER = UUID.randomUUID();
    private static final UUID LISTING = UUID.randomUUID();
    private TenancyRepository tenancyRepository;
    private TenancyRequestRepository requestRepository;
    private CurrentUser currentUser;
    private ListingContractClient listingClient;
    private EngagementEventBus eventBus;
    private TenancyService service;

    @BeforeEach
    void setUp() {
        tenancyRepository = mock(TenancyRepository.class);
        requestRepository = mock(TenancyRequestRepository.class);
        currentUser = new CurrentUser();
        listingClient = mock(ListingContractClient.class);
        eventBus = mock(EngagementEventBus.class);
        service = new TenancyService(tenancyRepository, requestRepository, currentUser,
                listingClient, eventBus);
        when(listingClient.getListingOwner(LISTING))
                .thenReturn(new ListingContractClient.ListingOwner(LISTING, OWNER));
        when(requestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tenancyRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(requestRepository.countOverlapping(any(), any(), any())).thenReturn(0L);
        when(tenancyRepository.countOverlappingBookings(any(), any(), any())).thenReturn(0L);
    }

    @Test
    void createsPendingRequestWithAuthenticatedTenantAndNotes() {
        currentUser.set(TENANT, "TENANT");

        TenancyDto created = service.createTenancyRequest(request("notes"), "key-1");

        assertEquals("pending", created.getStatus());
        assertEquals(TENANT, created.getTenantId());
        assertEquals("notes", created.getNotes());
        verify(requestRepository).save(argThat(saved -> saved.getStatus().equals("pending")
                && saved.getIdempotencyKey().equals("key-1")
                && saved.getStartDate().equals(LocalDate.of(2026, 11, 1))
                && saved.getEndDate().equals(LocalDate.of(2026, 12, 1))));
        verify(eventBus).publish(argThat(event -> event.eventType().equals("booking.created")));
    }

    @Test
    void rejectsOverlapBeforePersistence() {
        currentUser.set(TENANT, "TENANT");
        when(requestRepository.countOverlapping(LISTING, LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 12, 1))).thenReturn(1L);

        assertThrows(BookingConflictException.class,
                () -> service.createTenancyRequest(request("overlap"), "key-2"));
        verify(requestRepository, never()).save(any());
    }

    @Test
    void replaysSameIdempotentPayload() {
        currentUser.set(TENANT, "TENANT");
        TenancyRequestEntity existing = requestEntity("same");
        when(requestRepository.findByTenantIdAndIdempotencyKey(TENANT, "key-3"))
                .thenReturn(Optional.of(existing));

        TenancyDto result = service.createTenancyRequest(request("same"), "key-3");

        assertEquals(existing.getId(), result.getId());
        verify(requestRepository, never()).save(any());
    }

    @Test
    void rejectsIdempotencyPayloadMismatch() {
        currentUser.set(TENANT, "TENANT");
        when(requestRepository.findByTenantIdAndIdempotencyKey(TENANT, "key-4"))
                .thenReturn(Optional.of(requestEntity("original")));

        assertThrows(BookingConflictException.class,
                () -> service.createTenancyRequest(request("different"), "key-4"));
    }

    @Test
    void confirmsPendingRequestOnlyForOwner() {
        currentUser.set(OWNER, "OWNER");
        TenancyRequestEntity request = requestEntity("confirm");
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        TenancyDto result = service.updateStatus(request.getId(), "confirmed", "approved");

        assertEquals("confirmed", result.getStatus());
        verify(tenancyRepository).save(argThat(saved -> saved.getConfirmedBy().equals(OWNER)
                && saved.getStatus().equals("confirmed")));
        verify(eventBus).publish(argThat(event -> event.eventType().equals("booking.confirmed")));
    }

    @Test
    void rejectsIllegalTransition() {
        currentUser.set(OWNER, "OWNER");
        TenancyRequestEntity request = requestEntity("cancelled");
        request.setStatus("cancelled");
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        assertThrows(BookingConflictException.class,
                () -> service.updateStatus(request.getId(), "confirmed", null));
    }

    @Test
    void forbidsTenantFromConfirming() {
        currentUser.set(TENANT, "TENANT");
        TenancyRequestEntity request = requestEntity("forbidden");
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        assertThrows(SecurityException.class,
                () -> service.updateStatus(request.getId(), "confirmed", null));
    }

    @Test
    void cancelsPendingRequestForTenant() {
        currentUser.set(TENANT, "TENANT");
        TenancyRequestEntity request = requestEntity("cancel");
        when(requestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        TenancyDto result = service.updateStatus(request.getId(), "cancelled", null);

        assertEquals("cancelled", result.getStatus());
        verify(eventBus).publish(argThat(event -> event.eventType().equals("booking.cancelled")));
    }

    @Test
    void reportsMissingBooking() {
        currentUser.set(TENANT, "TENANT");
        UUID id = UUID.randomUUID();
        when(requestRepository.findById(id)).thenReturn(Optional.empty());
        when(tenancyRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.getTenancy(id));
    }

    @Test
    @Disabled("Requires PostgreSQL btree_gist exclusion constraints; H2 cannot verify this guarantee")
    void concurrentRequestsExactlyOneSucceedsOnPostgres() {
        fail("Run this scenario against PostgreSQL with two concurrent transactions");
    }

    private TenancyDto request(String notes) {
        TenancyDto dto = new TenancyDto();
        dto.setListingId(LISTING);
        dto.setMoveInDate(LocalDate.of(2026, 11, 1));
        dto.setEndDate(LocalDate.of(2026, 12, 1));
        dto.setNotes(notes);
        return dto;
    }

    private TenancyRequestEntity requestEntity(String message) {
        TenancyRequestEntity request = new TenancyRequestEntity();
        request.setId(UUID.randomUUID());
        request.setListingId(LISTING);
        request.setTenantId(TENANT);
        request.setMessage(message);
        request.setStatus("pending");
        request.setIdempotencyKey("key");
        request.setStartDate(LocalDate.of(2026, 11, 1));
        request.setEndDate(LocalDate.of(2026, 12, 1));
        return request;
    }
}
