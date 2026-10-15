package com.haystax.discovery.dto;

import java.util.Map;

public record RatingSummaryDto(
        Integer reviewCount,
        Double averageRating,
        Map<String, Integer> distribution
) {}
