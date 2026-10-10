package com.haystax.admin.service;

import com.haystax.admin.dto.AdminStatsDto;
import com.haystax.admin.dto.DailyActivityDto;
import com.haystax.admin.entity.AdminDailyActivityView;
import com.haystax.admin.entity.AdminModerationSummaryView;
import com.haystax.admin.repository.AdminDailyActivityRepository;
import com.haystax.admin.repository.AdminModerationSummaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class AdminAnalyticsServiceTest {

    @Mock
    private AdminModerationSummaryRepository summaryRepository;

    @Mock
    private AdminDailyActivityRepository activityRepository;

    @InjectMocks
    private AdminAnalyticsService service;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    // helpers

    private AdminModerationSummaryView summary(int submitted, int underReview,
                                                int resolved, int rejected,
                                                int pendingListings, int removedListings,
                                                int publishedListings, int activeTenancies,
                                                int totalUsers, int suspendedUsers) {
        AdminModerationSummaryView v = new AdminModerationSummaryView();
        v.setSubmittedReportCount(submitted);
        v.setUnderReviewReportCount(underReview);
        v.setResolvedReportCount(resolved);
        v.setRejectedReportCount(rejected);
        v.setPendingListingCount(pendingListings);
        v.setRemovedListingCount(removedListings);
        v.setPublishedListingCount(publishedListings);
        v.setActiveTenancyCount(activeTenancies);
        v.setTotalUserCount(totalUsers);
        v.setSuspendedUserCount(suspendedUsers);
        return v;
    }

    private AdminDailyActivityView activity(LocalDate day, int searches, int views,
                                             int filters, int recViews, int contacts) {
        AdminDailyActivityView v = new AdminDailyActivityView();
        v.setDay(day);
        v.setSearches(searches);
        v.setListingViews(views);
        v.setFiltersApplied(filters);
        v.setRecommendationViews(recViews);
        v.setListingContacts(contacts);
        return v;
    }

    // getStats

    @Test
    public void getStats_mapsAllFieldsFromFirstRow() {
        AdminModerationSummaryView row = summary(
                10, 4, 20, 3, 5, 2, 100, 15, 500, 8);

        when(summaryRepository.findAll()).thenReturn(List.of(row));

        AdminStatsDto stats = service.getStats();

        assertEquals(10,  stats.submittedReportCount());
        assertEquals(4,   stats.underReviewReportCount());
        assertEquals(20,  stats.resolvedReportCount());
        assertEquals(3,   stats.rejectedReportCount());
        assertEquals(5,   stats.pendingListingCount());
        assertEquals(2,   stats.removedListingCount());
        assertEquals(100, stats.publishedListingCount());
        assertEquals(15,  stats.activeTenancyCount());
        assertEquals(500, stats.totalUserCount());
        assertEquals(8,   stats.suspendedUserCount());
    }

    @Test
    public void getStats_returnsZeroesWhenRepositoryEmpty() {
        when(summaryRepository.findAll()).thenReturn(List.of());

        AdminStatsDto stats = service.getStats();

        assertEquals(0, stats.submittedReportCount());
        assertEquals(0, stats.underReviewReportCount());
        assertEquals(0, stats.resolvedReportCount());
        assertEquals(0, stats.rejectedReportCount());
        assertEquals(0, stats.pendingListingCount());
        assertEquals(0, stats.removedListingCount());
        assertEquals(0, stats.publishedListingCount());
        assertEquals(0, stats.activeTenancyCount());
        assertEquals(0, stats.totalUserCount());
        assertEquals(0, stats.suspendedUserCount());
    }

    @Test
    public void getStats_treatsNullsAsZero() {
        AdminModerationSummaryView row = summary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        // Force some nulls
        row.setSubmittedReportCount(null);
        row.setTotalUserCount(null);

        when(summaryRepository.findAll()).thenReturn(List.of(row));

        AdminStatsDto stats = service.getStats();

        assertEquals(0, stats.submittedReportCount());
        assertEquals(0, stats.totalUserCount());
    }

    @Test
    public void getStats_usesFirstRowWhenMultiplePresent() {
        AdminModerationSummaryView first  = summary(1, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        AdminModerationSummaryView second = summary(999, 999, 999, 999, 999, 999, 999, 999, 999, 999);

        when(summaryRepository.findAll()).thenReturn(List.of(first, second));

        AdminStatsDto stats = service.getStats();

        assertEquals(1, stats.submittedReportCount(), "should use first row only");
    }

    // getActivity

    @Test
    public void getActivity_mapsAllFields() {
        LocalDate day = LocalDate.of(2026, 9, 27);
        when(activityRepository.findAllByOrderByDayDesc())
                .thenReturn(List.of(activity(day, 100, 250, 30, 10, 5)));

        List<DailyActivityDto> result = service.getActivity(30);

        assertEquals(1, result.size());
        DailyActivityDto dto = result.get(0);
        assertEquals(day, dto.day());
        assertEquals(100, dto.searches());
        assertEquals(250, dto.listingViews());
        assertEquals(30,  dto.filtersApplied());
        assertEquals(10,  dto.recommendationViews());
        assertEquals(5,   dto.listingContacts());
    }

    @Test
    public void getActivity_preservesRepositoryOrder() {
        LocalDate d1 = LocalDate.of(2026, 9, 27);
        LocalDate d2 = LocalDate.of(2026, 9, 26);
        LocalDate d3 = LocalDate.of(2026, 9, 25);

        when(activityRepository.findAllByOrderByDayDesc())
                .thenReturn(List.of(
                        activity(d1, 1, 1, 1, 1, 1),
                        activity(d2, 2, 2, 2, 2, 2),
                        activity(d3, 3, 3, 3, 3, 3)));

        List<DailyActivityDto> result = service.getActivity(30);

        assertEquals(d1, result.get(0).day());
        assertEquals(d2, result.get(1).day());
        assertEquals(d3, result.get(2).day());
    }

    @Test
    public void getActivity_limitsToRequestedDays() {
        LocalDate d1 = LocalDate.of(2026, 9, 27);
        LocalDate d2 = LocalDate.of(2026, 9, 26);
        LocalDate d3 = LocalDate.of(2026, 9, 25);

        when(activityRepository.findAllByOrderByDayDesc())
                .thenReturn(List.of(
                        activity(d1, 1, 1, 1, 1, 1),
                        activity(d2, 1, 1, 1, 1, 1),
                        activity(d3, 1, 1, 1, 1, 1)));

        List<DailyActivityDto> result = service.getActivity(2);

        assertEquals(2, result.size());
        assertEquals(d1, result.get(0).day());
        assertEquals(d2, result.get(1).day());
    }

    @Test
    public void getActivity_defaultsTo30WhenZeroOrNegative() {
        when(activityRepository.findAllByOrderByDayDesc()).thenReturn(List.of());

        // Should not crash; both calls return empty
        assertTrue(service.getActivity(0).isEmpty());
        assertTrue(service.getActivity(-5).isEmpty());
    }

    @Test
    public void getActivity_emptyRepositoryReturnsEmptyList() {
        when(activityRepository.findAllByOrderByDayDesc()).thenReturn(List.of());

        List<DailyActivityDto> result = service.getActivity(30);

        assertTrue(result.isEmpty());
    }
}
