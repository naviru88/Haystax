-- ====================================================================
-- Flyway Migration V3: Member 3 (Engagement & Insights Official Schema Alignment)
-- Tables: tenancy_requests, tenancies, conversations, conversation_participants, messages, reviews, notifications, outbox_events
-- ====================================================================

-- 1. Tenancy Requests Table
CREATE TABLE IF NOT EXISTS tenancy_requests (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    owner_response_note TEXT,
    responded_by UUID,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tenancies Table
CREATE TABLE IF NOT EXISTS tenancies (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    tenancy_request_id UUID UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    confirmed_by UUID NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    end_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Conversations & Messages
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    listing_id UUID,
    tenancy_request_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    participant_role VARCHAR(32) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    body TEXT NOT NULL,
    attachment_path TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL,
    author_id UUID NOT NULL,
    tenancy_id UUID,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL,
    type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    listing_id UUID,
    conversation_id UUID,
    tenancy_id UUID,
    report_id UUID,
    broadcast_id UUID,
    data TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Outbox Events Table
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID DEFAULT random_uuid() PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload TEXT NOT NULL,
    event_version INTEGER DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    available_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
