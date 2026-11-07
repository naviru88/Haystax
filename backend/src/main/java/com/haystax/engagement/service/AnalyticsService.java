package com.haystax.engagement.service;

import com.haystax.engagement.adapter.ListingContractClient;
import com.haystax.engagement.auth.RequestScopedCurrentUser;
import com.haystax.engagement.dto.AnalyticsSummaryDto;
import com.haystax.engagement.entity.AnalyticsSummaryEntity;
import com.haystax.engagement.repository.AnalyticsSummaryRepository;
import com.haystax.engagement.repository.ReviewRepository;
import com.haystax.engagement.repository.TenancyRepository;
import com.haystax.engagement.repository.TenancyRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AnalyticsService {

    private final TenancyRepository tenancyRepository;
    private final TenancyRequestRepository requestRepository;
    private final ReviewRepository reviewRepository;
    private final AnalyticsSummaryRepository summaryRepository;
    private final RequestScopedCurrentUser currentUser;
    private final ListingContractClient listingClient;

    public AnalyticsService(TenancyRepository tenancyRepository,
                            TenancyRequestRepository requestRepository,
                            ReviewRepository reviewRepository,
                            AnalyticsSummaryRepository summaryRepository,
                            RequestScopedCurrentUser currentUser,
                            ListingContractClient listingClient) {
        this.tenancyRepository = tenancyRepository;
        this.requestRepository = requestRepository;
        this.reviewRepository = reviewRepository;
        this.summaryRepository = summaryRepository;
        this.currentUser = currentUser;
        this.listingClient = listingClient;
    }

    @Transactional
    public AnalyticsSummaryDto getAnalyticsSummary(UUID listingId, LocalDate from, LocalDate to) {
        UUID ownerId = listingClient.getListingOwner(listingId).ownerId();
        if (!ownerId.equals(currentUser.getId()) && !"ADMIN".equals(currentUser.getRole())) {
            throw new SecurityException("Only the listing owner or admin can view listing analytics.");
        }

        LocalDate periodStart = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate periodEnd = to != null ? to : LocalDate.now();

        Optional<AnalyticsSummaryEntity> existing = summaryRepository
                .findByListingIdAndPeriodStartAndPeriodEnd(listingId, periodStart, periodEnd);
        if (existing.isPresent()) {
            return mapToDto(existing.get());
        }

        long inquiries = requestRepository.countByListingId(listingId);
        long bookings = tenancyRepository.countByListingId(listingId);
        Double avgRating = reviewRepository.findAverageRatingByListingId(listingId);
        long reviewCount = reviewRepository.countByListingId(listingId);

        // Approximate occupancy rate and estimated revenue based on bookings
        double occupancyRate = bookings > 0 ? Math.min(100.0, bookings * 25.0) : 0.0;
        double estimatedRevenue = bookings * 15000.0;

        AnalyticsSummaryEntity entity = new AnalyticsSummaryEntity();
        entity.setId(UUID.randomUUID());
        entity.setListingId(listingId);
        entity.setOwnerId(ownerId);
        entity.setPeriodStart(periodStart);
        entity.setPeriodEnd(periodEnd);
        entity.setInquiries(inquiries);
        entity.setBookings(bookings);
        entity.setOccupancyRate(BigDecimal.valueOf(occupancyRate).setScale(2, RoundingMode.HALF_UP));
        entity.setEstimatedRevenue(BigDecimal.valueOf(estimatedRevenue).setScale(2, RoundingMode.HALF_UP));
        entity.setAvgRating(avgRating != null ? BigDecimal.valueOf(avgRating).setScale(2, RoundingMode.HALF_UP) : null);
        entity.setReviewCount(reviewCount);
        entity.setComputedAt(OffsetDateTime.now());

        AnalyticsSummaryEntity saved = summaryRepository.save(entity);
        return mapToDto(saved);
    }

    private AnalyticsSummaryDto mapToDto(AnalyticsSummaryEntity entity) {
        AnalyticsSummaryDto dto = new AnalyticsSummaryDto();
        dto.setId(entity.getId());
        dto.setListingId(entity.getListingId());
        dto.setFrom(entity.getPeriodStart());
        dto.setTo(entity.getPeriodEnd());
        dto.setTotalInquiries(entity.getInquiries());
        dto.setTotalBookings(entity.getBookings());
        dto.setOccupancyRate(entity.getOccupancyRate().doubleValue());
        dto.setEstimatedRevenue(entity.getEstimatedRevenue().doubleValue());
        dto.setAverageRating(entity.getAvgRating() != null ? entity.getAvgRating().doubleValue() : null);
        return dto;
    }
}
