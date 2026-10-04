package com.haystax.discovery.dto;

import java.math.BigDecimal;

public record SearchFiltersDto(
        String city,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String genderPolicy,
        String sort,             // relevance | price_asc | price_desc
        Integer page,
        Integer pageSize
) {
    public int safePage() {
        return page == null || page < 1 ? 1 : page;
    }

    public int safePageSize() {
        if (pageSize == null || pageSize < 1) return 12;
        return Math.min(pageSize, 100);
    }

    public String safeSort() {
        return sort == null || sort.isBlank() ? "relevance" : sort;
    }
}
