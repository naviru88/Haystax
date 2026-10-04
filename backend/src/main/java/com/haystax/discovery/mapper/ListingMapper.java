package com.haystax.discovery.mapper;

import com.haystax.discovery.dto.AmenityDto;
import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.ListingPhotoDto;
import com.haystax.discovery.dto.PreferenceDto;
import com.haystax.discovery.entity.PublishedListingView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;

@Component
public class ListingMapper {

    private static final Logger log = LoggerFactory.getLogger(ListingMapper.class);

    private final ObjectMapper objectMapper;

    public ListingMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ListingDto toDto(PublishedListingView entity, Double distanceKm) {
        List<AmenityDto> amenities = parseList(entity.getAmenities(), new TypeReference<>() {});
        List<ListingPhotoDto> photos = parseList(entity.getPhotos(), new TypeReference<>() {});
        List<PreferenceDto> preferences = parseList(entity.getPreferences(), new TypeReference<>() {});

        return new ListingDto(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getCity(),
                entity.getDistrict(),
                entity.getLocationLabel(),
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getPriceAmount(),
                entity.getCurrencyCode(),
                entity.getGenderPolicy(),
                entity.getTotalSlots(),
                entity.getAvailableSlots(),
                entity.getStatus(),
                entity.getOwnerDisplayName(),
                amenities,
                photos,
                preferences,
                null,           // ratingSummary — populated later when reviews exist
                distanceKm
        );
    }

    public ListingDto toDto(PublishedListingView entity) {
        return toDto(entity, null);
    }

    private <T> List<T> parseList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            log.warn("Failed to parse JSONB column, returning empty list. json={}", json, e);
            return Collections.emptyList();
        }
    }
}
