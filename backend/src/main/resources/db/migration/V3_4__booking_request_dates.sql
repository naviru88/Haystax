-- Booking request dates and PostgreSQL-level pending-request overlap protection.
-- Existing V3/V3_3 rows are retained; submitted requests are normalized to pending.

ALTER TABLE tenancy_requests
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE tenancy_requests
SET start_date = COALESCE(start_date, DATE '2026-11-01'),
    end_date = COALESCE(end_date, DATE '2027-03-31')
WHERE start_date IS NULL OR end_date IS NULL;

UPDATE tenancy_requests
SET status = 'pending'
WHERE status = 'submitted';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenancy_requests_status_check'
          AND conrelid = 'tenancy_requests'::regclass
    ) THEN
        ALTER TABLE tenancy_requests
            ADD CONSTRAINT tenancy_requests_status_check
            CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenancy_requests_valid_dates'
          AND conrelid = 'tenancy_requests'::regclass
    ) THEN
        ALTER TABLE tenancy_requests
            ADD CONSTRAINT tenancy_requests_valid_dates
            CHECK (end_date > start_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenancy_requests_no_overlap'
          AND conrelid = 'tenancy_requests'::regclass
    ) THEN
        ALTER TABLE tenancy_requests
            ADD CONSTRAINT tenancy_requests_no_overlap
            EXCLUDE USING gist (
                listing_id WITH =,
                daterange(start_date, end_date, '[)') WITH &&
            )
            WHERE (
                status IN ('pending', 'confirmed')
                AND start_date IS NOT NULL
                AND end_date IS NOT NULL
            );
    END IF;
END
$$;
