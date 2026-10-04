package com.haystax.discovery.mapper;

import com.haystax.discovery.dto.AmenityDto;
import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.dto.ListingPhotoDto;
import com.haystax.discovery.dto.PreferenceDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.util.PhotoUrlResolver;
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
    private final PhotoUrlResolver photoUrlResolver;

    public ListingMapper(ObjectMapper objectMapper, PhotoUrlResolver photoUrlResolver) {
        this.objectMapper = objectMapper;
        this.photoUrlResolver = photoUrlResolver;
    }

    public ListingDto toDto(PublishedListingView entity, Double distanceKm) {
        List<AmenityDto> amenities = parseList(entity.getAmenities(), new TypeReference<>() {});
        List<ListingPhotoDto> photos = parseList(entity.getPhotos(), new TypeReference<>() {})
                .stream()
                .map(this::resolvePhotoUrl)
                .toList();
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
                null,
                distanceKm
        );
    }

    public ListingDto toDto(PublishedListingView entity) {
        return toDto(entity, null);
    }

    private ListingPhotoDto resolvePhotoUrl(ListingPhotoDto photo) {
        return new ListingPhotoDto(
                photo.id(),
                photoUrlResolver.resolve(photo.storagePath()),
                photo.altText(),
                photo.sortOrder(),
                photo.isPrimary()
        );
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
