package com.haystax.owner.exception;

import com.haystax.owner.dto.ErrorResponseDto;
import com.haystax.owner.dto.ErrorResponseDto.FieldErrorDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Owner-slice exception handler so the owner endpoints return the exact OpenAPI
 * {@code ErrorResponse} shape:
 * <ul>
 *   <li>{@code OwnerApiException} -> its status + message (+ optional field errors)</li>
 *   <li>bean validation ({@code @Valid}) -> 422 with an array of {@code fieldErrors}</li>
 * </ul>
 * <p>
 * Scoped to {@code com.haystax.owner} and ordered highest-precedence, so the
 * shared {@code GlobalExceptionHandler} (used by admin/discovery/engagement,
 * 400 for validation, Map fieldErrors) is untouched for the other slices.
 */
@RestControllerAdvice(basePackages = "com.haystax.owner")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OwnerExceptionHandler {

    @ExceptionHandler(OwnerApiException.class)
    public ResponseEntity<ErrorResponseDto> handleOwnerApi(OwnerApiException ex,
                                                           HttpServletRequest req) {
        List<FieldErrorDto> fieldErrors = ex.fieldErrors();
        ErrorResponseDto body = (fieldErrors == null || fieldErrors.isEmpty())
                ? ErrorResponseDto.of(ex.status().value(), ex.status().getReasonPhrase(),
                        ex.getMessage(), req.getRequestURI())
                : new ErrorResponseDto(OffsetDateTime.now(), ex.status().value(),
                        ex.status().getReasonPhrase(), ex.getMessage(),
                        req.getRequestURI(), fieldErrors);
        return ResponseEntity.status(ex.status()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<FieldErrorDto> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new FieldErrorDto(fe.getField(), fe.getDefaultMessage()))
                .toList();
        ErrorResponseDto body = new ErrorResponseDto(
                OffsetDateTime.now(), HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "Unprocessable Entity", "One or more fields are invalid.",
                req.getRequestURI(), fieldErrors);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }
}
