package com.haystax.owner.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Shared error shape for every owner endpoint — OpenAPI {@code ErrorResponse}.
 * <p>
 * Contract quirk: the error payload uses snake_case everywhere EXCEPT the 422-only
 * {@code fieldErrors} property (the C1 spec names it fieldErrors verbatim), so this
 * record deliberately has NO class-level {@code @JsonNaming} — the exact wire name
 * is pinned with {@link JsonProperty}. Damage contained: timestamp/status/error/
 * message/path are single words, unaffected by naming strategy.
 */
public record ErrorResponseDto(
        @NotNull OffsetDateTime timestamp,
        int status,
        @NotNull String error,
        @NotNull String message,
        @NotNull String path,
        @JsonProperty("fieldErrors") List<FieldErrorDto> fieldErrors
) {

    public record FieldErrorDto(String field, String message) {
    }

    public static ErrorResponseDto of(int status, String error, String message, String path) {
        return new ErrorResponseDto(OffsetDateTime.now(), status, error, message, path, null);
    }

    public static ErrorResponseDto notImplemented(String path) {
        return of(HttpStatus.NOT_IMPLEMENTED.value(), "Not Implemented",
                "Endpoint is a Week 1 skeleton stub — implementation lands in Week 2+", path);
    }
}