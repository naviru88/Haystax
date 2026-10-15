package com.haystax.admin.dto;

import java.time.LocalDate;

public record DailyActivityDto(
        LocalDate day,
        Integer searches,
        Integer listingViews,
        Integer filtersApplied,
        Integer recommendationViews,
        Integer listingContacts
) {}
