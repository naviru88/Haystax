package com.haystax.owner.dto;

import com.fasterxml.jackson.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;

/**
 * PostGIS point ({@code geography(Point,4326)}) — OpenAPI {@code location}
 * inline schema (lat/lng, both required).
 * <p>
 * Wire-only in Week 1: the entity deliberately does NOT map the {@code location}
 * column (AGENTS.md C2; docs/m2-db-notes.md gap #7).
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LocationDto(double lat, double lng) {
}