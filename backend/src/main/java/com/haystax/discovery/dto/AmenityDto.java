package com.haystax.discovery.dto;

import java.util.UUID;

public record AmenityDto(
        UUID id,
        String code,
        String name
) {}
