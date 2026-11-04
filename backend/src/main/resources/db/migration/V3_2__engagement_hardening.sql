-- Engagement hardening: analytics summaries, booking idempotency,
-- concurrency-safe booking conflicts, review uniqueness, and unread indexes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS analytics_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    inquiries BIGINT NOT NULL DEFAULT 0 CHECK (inquiries >= 0),
    bookings BIGINT NOT NULL DEFAULT 0 CHECK (bookings >= 0),
    occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100),
    estimated_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (estimated_revenue >= 0),
    avg_rating NUMERIC(3,2) CHECK (avg_rating IS NULL OR (avg_rating >= 0 AND avg_rating <= 5)),
    review_count BIGINT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT analytics_summaries_period_valid CHECK (period_end >= period_start),
    CONSTRAINT analytics_summaries_listing_period_key
        UNIQUE (listing_id, period_start, period_end)
);

ALTER TABLE tenancy_requests
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS tenancy_requests_tenant_idempotency_key_uq
    ON tenancy_requests (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenancies_no_overlapping_active_booking'
          AND conrelid = 'tenancies'::regclass
    ) THEN
        ALTER TABLE tenancies
            ADD CONSTRAINT tenancies_no_overlapping_active_booking
            EXCLUDE USING gist (
                listing_id WITH =,
                daterange(
                    start_date,
                    COALESCE(end_date, 'infinity'::date),
                    '[]'
                ) WITH &&
            )
            WHERE (
                status IN ('active', 'approved', 'confirmed')
                AND start_date IS NOT NULL
            );
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_author_tenancy_uq
    ON reviews (author_id, tenancy_id)
    WHERE tenancy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx
    ON notifications (recipient_id, is_read);

CREATE INDEX IF NOT EXISTS notifications_unread_recipient_idx
    ON notifications (recipient_id)
    WHERE is_read = FALSE;
