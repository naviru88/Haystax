-- ====================================================================
-- Flyway Migration V3: Member 3 (Engagement & Insights Table Groups)
-- Tables: tenancy_requests, messages_notifications, boarding_reviews, analytics_summaries
-- ====================================================================

-- 1. Tenancy Requests / Bookings Table Group
CREATE TABLE IF NOT EXISTS tenancy_requests (
    id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    owner_id VARCHAR(64) NOT NULL,
    move_in_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenancy_listing_id ON tenancy_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_student_id ON tenancy_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_owner_id ON tenancy_requests(owner_id);

-- 2. Messages & Notifications Table Group
CREATE TABLE IF NOT EXISTS messages_notifications (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL DEFAULT 'MESSAGE', -- MESSAGE, NOTIFICATION
    sender_id VARCHAR(64) NOT NULL,
    recipient_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages_notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages_notifications(sender_id);

-- 3. Boarding Reviews & Ratings Table Group
CREATE TABLE IF NOT EXISTS boarding_reviews (
    id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    owner_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON boarding_reviews(listing_id);

-- 4. Analytics Summaries Aggregation Table Group
CREATE TABLE IF NOT EXISTS analytics_summaries (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL,
    total_inquiries INT DEFAULT 0,
    total_bookings INT DEFAULT 0,
    occupancy_rate NUMERIC(5,2) DEFAULT 0.00,
    estimated_revenue NUMERIC(12,2) DEFAULT 0.00,
    average_rating NUMERIC(3,2) DEFAULT 0.00,
    summary_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_owner_date ON analytics_summaries(owner_id, summary_date);
