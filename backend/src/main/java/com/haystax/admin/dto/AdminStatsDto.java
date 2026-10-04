package com.haystax.admin.dto;

public record AdminStatsDto(
        Integer submittedReportCount,
        Integer underReviewReportCount,
        Integer pendingListingCount,
        Integer removedListingCount,
        Integer suspendedUserCount
) {}
