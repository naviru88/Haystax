-- Local engagement fixtures. IDs are deterministic and are also used by the
-- Angular engagement JSON fixtures.

INSERT INTO tenancy_requests
    (id, listing_id, tenant_id, message, status, idempotency_key, created_at, updated_at)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000101',
     'b1111111-0000-0000-0000-000000000101',
     'u1111111-0000-0000-0000-000000000001',
     'Interested in the furnished room.',
     'submitted',
     'idem-booking-0001',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),
    ('a1b2c3d4-0000-0000-0000-000000000102',
     'b1111111-0000-0000-0000-000000000102',
     'u1111111-0000-0000-0000-000000000001',
     'Please confirm the move-in date.',
     'submitted',
     'idem-booking-0002',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),
    ('a1b2c3d4-0000-0000-0000-000000000103',
     'b1111111-0000-0000-0000-000000000101',
     'u1111111-0000-0000-0000-000000000003',
     'Conflict fixture: requested dates overlap the active booking.',
     'rejected',
     'idem-booking-conflict-0001',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenancies
    (id, listing_id, owner_id, tenant_id, tenancy_request_id, status,
     start_date, end_date, confirmed_by, confirmed_at, created_at, updated_at)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000201',
     'b1111111-0000-0000-0000-000000000101',
     'u1111111-0000-0000-0000-000000000002',
     'u1111111-0000-0000-0000-000000000001',
     'a1b2c3d4-0000-0000-0000-000000000101',
     'active',
     '2026-10-01',
     '2027-03-31',
     'u1111111-0000-0000-0000-000000000002',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),
    ('a1b2c3d4-0000-0000-0000-000000000202',
     'b1111111-0000-0000-0000-000000000102',
     'u1111111-0000-0000-0000-000000000002',
     'u1111111-0000-0000-0000-000000000001',
     NULL,
     'ended',
     '2026-01-01',
     '2026-06-30',
     'u1111111-0000-0000-0000-000000000002',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),
    ('a1b2c3d4-0000-0000-0000-000000000203',
     'b1111111-0000-0000-0000-000000000103',
     'u1111111-0000-0000-0000-000000000002',
     'u1111111-0000-0000-0000-000000000001',
     NULL,
     'active',
     '2026-11-01',
     '2027-04-30',
     'u1111111-0000-0000-0000-000000000002',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- An active tenancy that overlaps a1b2c3d4-0000-0000-0000-000000000201 is
-- intentionally not inserted: V3_2 must reject it at the database boundary.
-- INSERT INTO tenancies (...) VALUES (...);

INSERT INTO conversations
    (id, listing_id, tenancy_request_id, status, created_by, created_at, updated_at, last_message_at)
VALUES
    ('c1111111-0000-0000-0000-000000000001',
     'b1111111-0000-0000-0000-000000000101',
     'a1b2c3d4-0000-0000-0000-000000000101',
     'open',
     'u1111111-0000-0000-0000-000000000001',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),
    ('c2222222-0000-0000-0000-000000000002',
     'b1111111-0000-0000-0000-000000000102',
     NULL,
     'open',
     'u1111111-0000-0000-0000-000000000002',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants
    (conversation_id, user_id, participant_role, joined_at)
VALUES
    ('c1111111-0000-0000-0000-000000000001', 'u1111111-0000-0000-0000-000000000001', 'TENANT', CURRENT_TIMESTAMP),
    ('c1111111-0000-0000-0000-000000000001', 'u1111111-0000-0000-0000-000000000002', 'OWNER', CURRENT_TIMESTAMP),
    ('c2222222-0000-0000-0000-000000000002', 'u1111111-0000-0000-0000-000000000001', 'TENANT', CURRENT_TIMESTAMP),
    ('c2222222-0000-0000-0000-000000000002', 'u1111111-0000-0000-0000-000000000002', 'OWNER', CURRENT_TIMESTAMP)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages
    (id, conversation_id, sender_id, body, sent_at)
VALUES
    ('m1111111-0000-0000-0000-000000000001',
     'c1111111-0000-0000-0000-000000000001',
     'u1111111-0000-0000-0000-000000000001',
     'Hi, is room 101 available?',
     CURRENT_TIMESTAMP),
    ('m1111111-0000-0000-0000-000000000002',
     'c1111111-0000-0000-0000-000000000001',
     'u1111111-0000-0000-0000-000000000002',
     'Yes, I can confirm the room is available.',
     CURRENT_TIMESTAMP),
    ('m1111111-0000-0000-0000-000000000003',
     'c2222222-0000-0000-0000-000000000002',
     'u1111111-0000-0000-0000-000000000001',
     'Could you share the house rules?',
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications
    (id, recipient_id, type, title, body, listing_id, conversation_id, tenancy_id,
     is_read, read_at, created_at)
VALUES
    ('n1111111-0000-0000-0000-000000000001',
     'u1111111-0000-0000-0000-000000000001',
     'BOOKING_CREATED',
     'Booking inquiry received',
     'Your inquiry was submitted.',
     'b1111111-0000-0000-0000-000000000101',
     NULL,
     NULL,
     FALSE,
     NULL,
     CURRENT_TIMESTAMP),
    ('n1111111-0000-0000-0000-000000000002',
     'u1111111-0000-0000-0000-000000000001',
     'MESSAGE',
     'New message',
     'The owner replied to your inquiry.',
     'b1111111-0000-0000-0000-000000000101',
     'c1111111-0000-0000-0000-000000000001',
     NULL,
     TRUE,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews
    (id, listing_id, author_id, tenancy_id, rating, title, body, status, created_at, updated_at)
VALUES
    ('r1111111-0000-0000-0000-000000000001',
     'b1111111-0000-0000-0000-000000000102',
     'u1111111-0000-0000-0000-000000000001',
     'a1b2c3d4-0000-0000-0000-000000000202',
     5,
     'Great location',
     'Clean and close to campus.',
     'published',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),
    ('r1111111-0000-0000-0000-000000000002',
     'b1111111-0000-0000-0000-000000000103',
     'u1111111-0000-0000-0000-000000000001',
     'a1b2c3d4-0000-0000-0000-000000000203',
     2,
     'Pending tenancy',
     'This fixture represents a review that must be rejected because the tenancy is not completed.',
     'hidden',
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO analytics_summaries
    (id, listing_id, owner_id, period_start, period_end, inquiries, bookings,
     occupancy_rate, estimated_revenue, avg_rating, review_count, computed_at)
VALUES
    ('a1111111-0000-0000-0000-000000000001',
     'b1111111-0000-0000-0000-000000000101',
     'u1111111-0000-0000-0000-000000000002',
     '2026-10-01',
     '2026-10-31',
     4,
     2,
     66.67,
     45000.00,
     4.50,
     2,
     CURRENT_TIMESTAMP),
    ('a1111111-0000-0000-0000-000000000002',
     'b1111111-0000-0000-0000-000000000103',
     'u1111111-0000-0000-0000-000000000002',
     '2025-01-01',
     '2025-01-31',
     0,
     0,
     0,
     0,
     NULL,
     0,
     CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
