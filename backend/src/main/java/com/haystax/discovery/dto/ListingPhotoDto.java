package com.haystax.discovery.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record ListingPhotoDto(
        UUID id,
        @JsonProperty("storagePath") String storagePath,
        @JsonProperty("altText") String altText,
        @JsonProperty("sortOrder") Integer sortOrder,
        @JsonProperty("isPrimary") Boolean isPrimary
) {}
