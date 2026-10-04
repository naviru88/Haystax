package com.haystax.admin.service;

import com.haystax.admin.dto.AdminStatsDto;
import com.haystax.admin.dto.DailyActivityDto;
import com.haystax.admin.entity.AdminDailyActivityView;
import com.haystax.admin.entity.AdminModerationSummaryView;
import com.haystax.admin.repository.AdminDailyActivityRepository;
import com.haystax.admin.repository.AdminModerationSummaryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminAnalyticsService {

    private final AdminModerationSummaryRepository summaryRepository;
    private final AdminDailyActivityRepository activityRepository;

    public AdminAnalyticsService(AdminModerationSummaryRepository summaryRepository,
                                 AdminDailyActivityRepository activityRepository) {
        this.summaryRepository = summaryRepository;
        this.activityRepository = activityRepository;
    }

    public AdminStatsDto getStats() {
        return summaryRepository.findAll().stream()
                .findFirst()
                .map(this::toStats)
                .orElseGet(this::emptyStats);
    }

    public List<DailyActivityDto> getActivity(int days) {
        List<AdminDailyActivityView> rows = activityRepository.findAllByOrderByDayDesc();
        int limit = days <= 0 ? 30 : days;
        return rows.stream()
                .limit(limit)
                .map(r -> new DailyActivityDto(
                        r.getDay(),
                        r.getSearches(),
                        r.getListingViews(),
                        r.getFiltersApplied(),
                        r.getRecommendationViews(),
                        r.getListingContacts()))
                .toList();
    }

    private AdminStatsDto toStats(AdminModerationSummaryView row) {
        return new AdminStatsDto(
                nz(row.getSubmittedReportCount()),
                nz(row.getUnderReviewReportCount()),
                nz(row.getResolvedReportCount()),
                nz(row.getRejectedReportCount()),
                nz(row.getPendingListingCount()),
                nz(row.getRemovedListingCount()),
                nz(row.getPublishedListingCount()),
                nz(row.getActiveTenancyCount()),
                nz(row.getTotalUserCount()),
                nz(row.getSuspendedUserCount()));
    }

    private AdminStatsDto emptyStats() {
        return new AdminStatsDto(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private Integer nz(Integer v) {
        return v == null ? 0 : v;
    }
}
