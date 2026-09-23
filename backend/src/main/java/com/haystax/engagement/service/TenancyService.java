package com.haystax.engagement.service;

import com.haystax.common.exception.DoubleBookingException;
import com.haystax.engagement.dto.TenancyDto;
import com.haystax.engagement.entity.TenancyEntity;
import com.haystax.engagement.repository.TenancyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class TenancyService {

    private final TenancyRepository tenancyRepository;

    public TenancyService(TenancyRepository tenancyRepository) {
        this.tenancyRepository = tenancyRepository;
    }

    public List<TenancyDto> getTenanciesForUser(UUID userId) {
        return tenancyRepository.findByTenantIdOrOwnerId(userId, userId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public TenancyDto createTenancyRequest(TenancyDto dto) {
        // Concurrency-safe check for double-booking date overlap
        long overlapping = tenancyRepository.countOverlappingBookings(dto.getListingId(), dto.getMoveInDate());
        if (overlapping > 0) {
            throw new DoubleBookingException("Listing " + dto.getListingId() + " is already booked for move-in date " + dto.getMoveInDate());
        }

        TenancyEntity entity = new TenancyEntity();
        entity.setId(dto.getId() != null ? dto.getId() : UUID.randomUUID());
        entity.setListingId(dto.getListingId());
        entity.setTenantId(dto.getTenantId());
        entity.setOwnerId(dto.getOwnerId() != null ? dto.getOwnerId() : UUID.randomUUID());
        entity.setStartDate(dto.getMoveInDate());
        entity.setStatus("active");
        entity.setConfirmedBy(entity.getOwnerId());
        entity.setConfirmedAt(OffsetDateTime.now());
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());

        TenancyEntity saved = tenancyRepository.save(entity);
        return mapToDto(saved);
    }

    private TenancyDto mapToDto(TenancyEntity entity) {
        TenancyDto dto = new TenancyDto();
        dto.setId(entity.getId());
        dto.setListingId(entity.getListingId());
        dto.setTenantId(entity.getTenantId());
        dto.setOwnerId(entity.getOwnerId());
        dto.setMoveInDate(entity.getStartDate());
        dto.setStatus(entity.getStatus());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}
