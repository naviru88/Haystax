package com.haystax.owner.dto;

/**
 * DB enum {@code gender_policy} — OpenAPI {@code GenderPolicy} (default {@code any}).
 * <p>
 * Constants are intentionally lowercase: {@code @Enumerated(STRING)} matches the DB
 * enum values exactly and the JSON wire values stay lowercase per the contract.
 * Gender preference is optional (team business answer).
 */
public enum GenderPolicy {
    any,
    female_only,
    male_only
}