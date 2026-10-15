package com.haystax.owner.exception;

import com.haystax.owner.dto.ErrorResponseDto.FieldErrorDto;
import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Business/authorization error raised by the owner slice services.
 * <p>
 * Handled by {@link OwnerExceptionHandler} (owner-scoped) so the response matches
 * the OpenAPI {@code ErrorResponse} shape (422 with an array of field errors).
 */
public class OwnerApiException extends RuntimeException {

    private final HttpStatus status;
    private final List<FieldErrorDto> fieldErrors;

    public OwnerApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
        this.fieldErrors = null;
    }

    public OwnerApiException(HttpStatus status, String message, List<FieldErrorDto> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = fieldErrors;
    }

    public HttpStatus status() {
        return status;
    }

    public List<FieldErrorDto> fieldErrors() {
        return fieldErrors;
    }
}
