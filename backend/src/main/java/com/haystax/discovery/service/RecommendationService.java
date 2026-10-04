package com.haystax.discovery.service;

import com.haystax.discovery.dto.ListingDto;
import com.haystax.discovery.entity.PublishedListingView;
import com.haystax.discovery.mapper.ListingMapper;
import com.haystax.discovery.repository.ListingReadRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

// Deterministic recommendations — no randomness, no ML.
@Service
public class RecommendationService {

    private static final double WEIGHT_AVAILABILITY = 0.7;
    private static final double WEIGHT_RECENCY = 0.3;
    private static final long RECENCY_WINDOW_DAYS = 30;

    private final ListingReadRepository repository;
    private final ListingMapper mapper;

    public RecommendationService(ListingReadRepository repository, ListingMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public List<ListingDto> recommend(int limit) {
        if (limit <= 0) limit = 12;

        var cutoff = java.time.Instant.now().minus(
                java.time.Duration.ofDays(RECENCY_WINDOW_DAYS));

        return repository.findAll().stream()
                .filter(l -> l.getAvailableSlots() != null && l.getAvailableSlots() > 0)
                .sorted(Comparator
                        .comparingDouble(this::score).reversed()
                        .thenComparing(PublishedListingView::getPublishedAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PublishedListingView::getId))
                .limit(limit)
                .map(mapper::toDto)
                .toList();
    }

    private double score(PublishedListingView l) {
        double availabilityRatio = computeAvailabilityRatio(l);
        double recencyBoost = computeRecencyBoost(l);
        return WEIGHT_AVAILABILITY * availabilityRatio + WEIGHT_RECENCY * recencyBoost;
    }

    private double computeAvailabilityRatio(PublishedListingView l) {
        Integer total = l.getTotalSlots();
        Integer available = l.getAvailableSlots();
        if (total == null || total == 0 || available == null) return 0.0;
        return Math.max(0.0, Math.min(1.0, (double) available / total));
    }

    private double computeRecencyBoost(PublishedListingView l) {
        if (l.getPublishedAt() == null) return 0.0;
        long daysOld = java.time.Duration.between(l.getPublishedAt(), java.time.Instant.now()).toDays();
        if (daysOld <= 0) return 1.0;
        if (daysOld >= RECENCY_WINDOW_DAYS) return 0.0;
        return 1.0 - ((double) daysOld / RECENCY_WINDOW_DAYS);
    }
}
