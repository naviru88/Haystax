package com.haystax.owner.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the {@code @Size(2..120)} rule on {@code display_name} (OpenAPI
 * {@code ProfileUpdateRequest}) is enforced by bean validation — a 1-char or
 * 121-char display name produces a violation that the owner handler maps to 422.
 */
class ProfileUpdateValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void displayNameOfOneCharFailsValidation() {
        Set<jakarta.validation.ConstraintViolation<ProfileUpdateDto>> violations =
                validator.validate(new ProfileUpdateDto("A", null, null));
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("2"));
    }

    @Test
    void displayNameOf121CharsFailsValidation() {
        Set<jakarta.validation.ConstraintViolation<ProfileUpdateDto>> violations =
                validator.validate(new ProfileUpdateDto("x".repeat(121), null, null));
        assertEquals(1, violations.size());
    }

    @Test
    void validDisplayNamePasses() {
        Set<jakarta.validation.ConstraintViolation<ProfileUpdateDto>> violations =
                validator.validate(new ProfileUpdateDto("Valid Name", null, null));
        assertTrue(violations.isEmpty());
    }
}
