package com.haystax.common.util;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int page,
        int pageSize,
        long total,
        int totalPages
) {
    public static <T> PageResponse<T> of(List<T> items, int page, int pageSize, long total) {
        int totalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) total / pageSize);
        return new PageResponse<>(items, page, pageSize, total, totalPages);
    }
}
