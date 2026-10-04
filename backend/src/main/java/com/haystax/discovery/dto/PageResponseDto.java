package com.haystax.discovery.dto;

import java.util.List;

public record PageResponseDto<T>(
        List<T> items,
        long total,
        int page,
        int pageSize,
        int totalPages
) {
    public static <T> PageResponseDto<T> of(List<T> items, long total, int page, int pageSize) {
        int totalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) total / pageSize);
        return new PageResponseDto<>(items, total, page, pageSize, totalPages);
    }
}
