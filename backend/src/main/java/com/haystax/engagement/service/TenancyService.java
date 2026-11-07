package com.haystax.engagement.service;

import com.haystax.common.exception.BookingConflictException;
import com.haystax.engagement.adapter.ListingContractClient;
import com.haystax.engagement.auth.CurrentUser;
import com.haystax.engagement.dto.TenancyDto;
import com.haystax.engagement.entity.TenancyEntity;
import com.haystax.engagement.entity.TenancyRequestEntity;
import com.haystax.engagement.event.BookingCancelledEvent;
import com.haystax.engagement.event.BookingConfirmedEvent;
import com.haystax.engagement.event.BookingCreatedEvent;
import com.haystax.engagement.event.EngagementEventBus;
import com.haystax.engagement.repository.TenancyRepository;
import com.haystax.engagement.repository.TenancyRequestRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class TenancyService {
    private final TenancyRepository tenancyRepository;
    private final TenancyRequestRepository requestRepository;
    private final CurrentUser currentUser;
    private final ListingContractClient listingClient;
    private final EngagementEventBus eventBus;

    public TenancyService(TenancyRepository tenancyRepository,
                          TenancyRequestRepository requestRepository,
                          CurrentUser currentUser,
                          ListingContractClient listingClient,
                          EngagementEventBus eventBus) {
        this.tenancyRepository = tenancyRepository;
        this.requestRepository = requestRepository;
        this.currentUser = currentUser;
        this.listingClient = listingClient;
        this.eventBus = eventBus;
    }

    public List<TenancyDto> getTenanciesForUser(UUID ignoredUserId) {
        UUID userId = currentUser.getId() == null ? ignoredUserId : currentUser.getId();
        List<TenancyDto> result = new ArrayList<>();
        requestRepository.findAll().stream()
                .filter(request -> canAccess(request, userId))
                .map(this::mapRequest)
                .forEach(result::add);
        tenancyRepository.findByTenantIdOrOwnerId(userId, userId).stream()
                .map(this::mapTenancy)
                .forEach(result::add);
        return result.stream()
                .sorted(Comparator.comparing(TenancyDto::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TenancyDto createTenancyRequest(TenancyDto dto) {
        return createTenancyRequest(dto, null);
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TenancyDto createTenancyRequest(TenancyDto dto, String idempotencyKey) {
        UUID tenantId = requireUser("TENANT");
        validateDates(dto);
        if (dto.getListingId() == null) {
            throw new IllegalArgumentException("listingId is required");
        }
        ListingContractClient.ListingOwner listing = listingClient.getListingOwner(dto.getListingId());
        if (dto.getTenantId() != null && !tenantId.equals(dto.getTenantId())) {
            throw new IllegalArgumentException("tenantId must not differ from authenticated user");
        }
        if (dto.getOwnerId() != null && !listing.ownerId().equals(dto.getOwnerId())) {
            throw new IllegalArgumentException("ownerId must match the listing contract");
        }

        if (idempotencyKey != null) {
            var existing = requestRepository.findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey);
            if (existing.isPresent()) {
                if (!samePayload(existing.get(), dto)) {
                    throw new BookingConflictException("Idempotency key was reused with a different payload");
                }
                return mapRequest(existing.get());
            }
        }

        if (requestRepository.countOverlapping(dto.getListingId(), dto.getMoveInDate(), dto.getEndDate()) > 0
                || tenancyRepository.countOverlappingBookings(dto.getListingId(), dto.getMoveInDate(), dto.getEndDate()) > 0) {
            throw new BookingConflictException("The requested dates overlap an existing booking");
        }

        OffsetDateTime now = OffsetDateTime.now();
        TenancyRequestEntity request = new TenancyRequestEntity();
        request.setId(UUID.randomUUID());
        request.setListingId(dto.getListingId());
        request.setTenantId(tenantId);
        request.setMessage(dto.getNotes());
        request.setStatus("pending");
        request.setIdempotencyKey(idempotencyKey);
        request.setStartDate(dto.getMoveInDate());
        request.setEndDate(dto.getEndDate());
        request.setCreatedAt(now);
        request.setUpdatedAt(now);
        try {
            TenancyRequestEntity saved = requestRepository.save(request);
            TenancyDto result = mapRequest(saved);
            eventBus.publish(new BookingCreatedEvent(UUID.randomUUID(), 1, now, saved.getId(), tenantId, result));
            return result;
        } catch (DataIntegrityViolationException ex) {
            throw new BookingConflictException("The booking conflicts with another request", ex);
        }
    }

    @Transactional
    public TenancyDto updateStatus(UUID requestId, String status, String responseNote) {
        TenancyRequestEntity request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Booking was not found: " + requestId));
        UUID actor = requireUser(null);
        UUID ownerId = listingClient.getListingOwner(request.getListingId()).ownerId();
        String normalized = status == null ? "" : status.toLowerCase();
        if ("confirmed".equals(normalized)) {
            requireOwner(actor, ownerId);
            requireStatus(request, "pending");
            TenancyEntity tenancy = new TenancyEntity();
            tenancy.setId(UUID.randomUUID());
            tenancy.setListingId(request.getListingId());
            tenancy.setOwnerId(ownerId);
            tenancy.setTenantId(request.getTenantId());
            tenancy.setTenancyRequestId(request.getId());
            tenancy.setStatus("confirmed");
            tenancy.setStartDate(request.getStartDate());
            tenancy.setEndDate(request.getEndDate());
            tenancy.setConfirmedBy(actor);
            tenancy.setConfirmedAt(OffsetDateTime.now());
            tenancy.setCreatedAt(request.getCreatedAt());
            tenancy.setUpdatedAt(OffsetDateTime.now());
            try {
                tenancyRepository.save(tenancy);
            } catch (DataIntegrityViolationException ex) {
                throw new BookingConflictException("The booking conflicts with another tenancy", ex);
            }
            request.setStatus("confirmed");
            request.setUpdatedAt(OffsetDateTime.now());
            if (responseNote != null) request.setMessage(responseNote);
            TenancyRequestEntity saved = requestRepository.save(request);
            TenancyDto result = mapRequest(saved);
            eventBus.publish(new BookingConfirmedEvent(UUID.randomUUID(), 1, OffsetDateTime.now(),
                    saved.getId(), actor, result));
            return result;
        }
        if ("cancelled".equals(normalized)) {
            if (!actor.equals(request.getTenantId()) && !actor.equals(ownerId)) {
                throw new SecurityException("Only the tenant or listing owner may cancel this booking");
            }
            requireStatus(request, "pending", "confirmed");
            request.setStatus("cancelled");
            request.setUpdatedAt(OffsetDateTime.now());
            if (responseNote != null) request.setMessage(responseNote);
            tenancyRepository.findByTenancyRequestId(request.getId()).ifPresent(tenancy -> {
                tenancy.setStatus("cancelled");
                tenancy.setUpdatedAt(OffsetDateTime.now());
                tenancyRepository.save(tenancy);
            });
            TenancyRequestEntity saved = requestRepository.save(request);
            TenancyDto result = mapRequest(saved);
            eventBus.publish(new BookingCancelledEvent(UUID.randomUUID(), 1, OffsetDateTime.now(),
                    saved.getId(), actor, result));
            return result;
        }
        if ("rejected".equals(normalized)) {
            requireOwner(actor, ownerId);
            requireStatus(request, "pending");
            request.setStatus("rejected");
            request.setUpdatedAt(OffsetDateTime.now());
            if (responseNote != null) request.setMessage(responseNote);
            return mapRequest(requestRepository.save(request));
        }
        throw new IllegalArgumentException("Unsupported booking status: " + status);
    }

    public TenancyDto getTenancy(UUID id) {
        TenancyRequestEntity request = requestRepository.findById(id).orElse(null);
        if (request != null) {
            ensureAccess(request);
            return mapRequest(request);
        }
        TenancyEntity tenancy = tenancyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking was not found: " + id));
        if (!canAccess(tenancy)) throw new SecurityException("You cannot access this booking");
        return mapTenancy(tenancy);
    }

    private UUID requireUser(String requiredRole) {
        if (currentUser.getId() == null) throw new SecurityException("Authentication is required");
        if (requiredRole != null && !requiredRole.equals(currentUser.getRole())) {
            throw new SecurityException("Only " + requiredRole + " users may perform this action");
        }
        return currentUser.getId();
    }

    private void requireOwner(UUID actor, UUID ownerId) {
        if (!actor.equals(ownerId) && !"ADMIN".equals(currentUser.getRole())) {
            throw new SecurityException("Only the listing owner may perform this action");
        }
    }

    private void requireStatus(TenancyRequestEntity request, String... allowed) {
        for (String value : allowed) if (value.equals(request.getStatus())) return;
        throw new BookingConflictException("Illegal booking status transition from " + request.getStatus());
    }

    private void validateDates(TenancyDto dto) {
        if (dto.getMoveInDate() == null || dto.getEndDate() == null
                || !dto.getEndDate().isAfter(dto.getMoveInDate())) {
            throw new IllegalArgumentException("endDate must be after moveInDate");
        }
    }

    private boolean samePayload(TenancyRequestEntity request, TenancyDto dto) {
        return request.getListingId().equals(dto.getListingId())
                && request.getStartDate().equals(dto.getMoveInDate())
                && request.getEndDate().equals(dto.getEndDate())
                && java.util.Objects.equals(request.getMessage(), dto.getNotes());
    }

    private boolean canAccess(TenancyRequestEntity request, UUID userId) {
        return request.getTenantId().equals(userId)
                || listingClient.getListingOwner(request.getListingId()).ownerId().equals(userId);
    }

    private boolean canAccess(TenancyEntity tenancy) {
        return tenancy.getTenantId().equals(currentUser.getId())
                || tenancy.getOwnerId().equals(currentUser.getId())
                || "ADMIN".equals(currentUser.getRole());
    }

    private void ensureAccess(TenancyRequestEntity request) {
        if (!canAccess(request, currentUser.getId()) && !"ADMIN".equals(currentUser.getRole())) {
            throw new SecurityException("You cannot access this booking");
        }
    }

    private TenancyDto mapRequest(TenancyRequestEntity request) {
        TenancyDto dto = baseDto(request.getId(), request.getListingId(), request.getTenantId(),
                listingClient.getListingOwner(request.getListingId()).ownerId(), request.getStatus(),
                request.getStartDate(), request.getEndDate(), request.getCreatedAt());
        dto.setNotes(request.getMessage());
        return dto;
    }

    private TenancyDto mapTenancy(TenancyEntity tenancy) {
        return baseDto(tenancy.getId(), tenancy.getListingId(), tenancy.getTenantId(), tenancy.getOwnerId(),
                tenancy.getStatus(), tenancy.getStartDate(), tenancy.getEndDate(), tenancy.getCreatedAt());
    }

    private TenancyDto baseDto(UUID id, UUID listingId, UUID tenantId, UUID ownerId, String status,
                               java.time.LocalDate start, java.time.LocalDate end, OffsetDateTime created) {
        TenancyDto dto = new TenancyDto();
        dto.setId(id);
        dto.setListingId(listingId);
        dto.setTenantId(tenantId);
        dto.setOwnerId(ownerId);
        dto.setMoveInDate(start);
        dto.setEndDate(end);
        dto.setStatus(status);
        dto.setCreatedAt(created);
        return dto;
    }
}
