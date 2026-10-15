package com.haystax.owner.service;

import com.haystax.owner.dto.AmenityDto;
import com.haystax.owner.repository.AmenityRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * {@code GET /api/owner/amenities} — active amenities for the listing editor.
 */
@Service
public class AmenityService {

    private final AmenityRepository amenityRepository;

    public AmenityService(AmenityRepository amenityRepository) {
        this.amenityRepository = amenityRepository;
    }

    public List<AmenityDto> listActive() {
        return amenityRepository.findActiveOrdered();
    }
}
