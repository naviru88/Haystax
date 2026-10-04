package com.haystax.owner.dto;

/**
 * DB enum {@code listing_status} — OpenAPI {@code ListingStatus} (default {@code draft}).
 * <p>
 * Constants are intentionally lowercase: {@code @Enumerated(STRING)} matches the DB
 * enum values exactly and the JSON wire values stay lowercase per the contract.
 * Display-only for the owner slice — enforcement (moderation) is the admin slice.
 */
public enum ListingStatus {
    draft,
    pending_review,
    published,
    paused,
    removed
}