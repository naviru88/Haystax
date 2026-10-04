package com.haystax.discovery.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ListingDto(
        UUID id,
        String title,
        String description,
        String city,
        String district,
        String locationLabel,
        Double lat,
        Double lng,
        BigDecimal priceAmount,
        String currencyCode,
        String genderPolicy,
        Integer totalSlots,
        Integer availableSlots,
        String status,
        String ownerDisplayName,
        List<AmenityDto> amenities,
        List<ListingPhotoDto> photos,
        List<PreferenceDto> preferences,
        RatingSummaryDto ratingSummary,
        Double distanceKm
) {}
