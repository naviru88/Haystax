package com.haystax.engagement.dto;

import java.util.List;

public record PageResponse<T>(List<T> content, PageMetadata page) {
    public record PageMetadata(int page, int size, long totalElements, int totalPages) {}
}
