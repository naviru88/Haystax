package com.haystax.discovery.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record PreferenceDto(
        UUID id,
        String code,
        String name,
        @JsonProperty("isRequired") Boolean isRequired,
        String notes
) {}
