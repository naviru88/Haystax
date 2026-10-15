package com.haystax.admin.dto;

public record AdminStatsDto(
        Integer submittedReportCount,
        Integer underReviewReportCount,
        Integer resolvedReportCount,
        Integer rejectedReportCount,
        Integer pendingListingCount,
        Integer removedListingCount,
        Integer publishedListingCount,
        Integer activeTenancyCount,
        Integer totalUserCount,
        Integer suspendedUserCount
) {}
