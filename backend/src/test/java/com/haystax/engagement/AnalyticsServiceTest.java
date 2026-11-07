package com.haystax.engagement;

import com.haystax.engagement.adapter.ListingContractClient;
import com.haystax.engagement.auth.RequestScopedCurrentUser;
import com.haystax.engagement.dto.AnalyticsSummaryDto;
import com.haystax.engagement.entity.AnalyticsSummaryEntity;
import com.haystax.engagement.repository.AnalyticsSummaryRepository;
import com.haystax.engagement.repository.ReviewRepository;
import com.haystax.engagement.repository.TenancyRepository;
import com.haystax.engagement.repository.TenancyRequestRepository;
import com.haystax.engagement.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AnalyticsServiceTest {

    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final UUID LISTING_ID = UUID.randomUUID();

    private TenancyRepository tenancyRepository;
    private TenancyRequestRepository requestRepository;
    private ReviewRepository reviewRepository;
    private AnalyticsSummaryRepository summaryRepository;
    private RequestScopedCurrentUser currentUser;
    private ListingContractClient listingClient;
    private AnalyticsService service;

    @BeforeEach
    void setUp() {
        tenancyRepository = mock(TenancyRepository.class);
        requestRepository = mock(TenancyRequestRepository.class);
        reviewRepository = mock(ReviewRepository.class);
        summaryRepository = mock(AnalyticsSummaryRepository.class);
        currentUser = new RequestScopedCurrentUser();
        listingClient = mock(ListingContractClient.class);

        when(listingClient.getListingOwner(LISTING_ID))
                .thenReturn(new ListingContractClient.ListingOwner(LISTING_ID, OWNER_ID));

        service = new AnalyticsService(
                tenancyRepository, requestRepository, reviewRepository,
                summaryRepository, currentUser, listingClient
        );
    }

    @Test
    void ownerCanFetchAnalyticsSummary() {
        currentUser.set(OWNER_ID, "OWNER");

        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 2, 1);

        when(summaryRepository.findByListingIdAndPeriodStartAndPeriodEnd(LISTING_ID, from, to))
                .thenReturn(Optional.empty());
        when(requestRepository.countByListingId(LISTING_ID)).thenReturn(10L);
        when(tenancyRepository.countByListingId(LISTING_ID)).thenReturn(4L);
        when(reviewRepository.findAverageRatingByListingId(LISTING_ID)).thenReturn(4.8);
        when(reviewRepository.countByListingId(LISTING_ID)).thenReturn(3L);
        when(summaryRepository.save(any(AnalyticsSummaryEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AnalyticsSummaryDto summary = service.getAnalyticsSummary(LISTING_ID, from, to);

        assertNotNull(summary);
        assertEquals(LISTING_ID, summary.getListingId());
        assertEquals(10L, summary.getTotalInquiries());
        assertEquals(4L, summary.getTotalBookings());
        assertEquals(4.8, summary.getAverageRating());
        assertEquals(100.0, summary.getOccupancyRate()); // 4 * 25
        assertEquals(60000.0, summary.getEstimatedRevenue()); // 4 * 15000
    }

    @Test
    void nonOwnerCannotFetchAnalytics() {
        currentUser.set(UUID.randomUUID(), "TENANT");

        assertThrows(SecurityException.class,
                () -> service.getAnalyticsSummary(LISTING_ID, null, null));
    }

    @Test
    void returnsExistingSummaryIfComputed() {
        currentUser.set(OWNER_ID, "OWNER");

        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 2, 1);

        AnalyticsSummaryEntity entity = new AnalyticsSummaryEntity();
        entity.setId(UUID.randomUUID());
        entity.setListingId(LISTING_ID);
        entity.setOwnerId(OWNER_ID);
        entity.setPeriodStart(from);
        entity.setPeriodEnd(to);
        entity.setInquiries(5L);
        entity.setBookings(2L);
        entity.setOccupancyRate(BigDecimal.valueOf(50.0));
        entity.setEstimatedRevenue(BigDecimal.valueOf(30000.0));
        entity.setAvgRating(BigDecimal.valueOf(4.5));

        when(summaryRepository.findByListingIdAndPeriodStartAndPeriodEnd(LISTING_ID, from, to))
                .thenReturn(Optional.of(entity));

        AnalyticsSummaryDto summary = service.getAnalyticsSummary(LISTING_ID, from, to);

        assertNotNull(summary);
        assertEquals(5L, summary.getTotalInquiries());
        assertEquals(2L, summary.getTotalBookings());
        assertEquals(50.0, summary.getOccupancyRate());
        verify(summaryRepository, never()).save(any());
    }
}
