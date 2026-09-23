-- ====================================================================
-- Flyway Seed V3_1: Seed Data Aligned with Standard Hex UUID Schema
-- ====================================================================

-- 1. Seed Tenancy Requests
INSERT INTO tenancy_requests (id, listing_id, tenant_id, message, status, created_at)
VALUES
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000101', '33333333-0000-0000-0000-000000000001', 'Interested in moving in next month.', 'submitted', CURRENT_TIMESTAMP);

-- 2. Seed Tenancies
INSERT INTO tenancies (id, listing_id, owner_id, tenant_id, tenancy_request_id, status, start_date, end_date, confirmed_by, created_at)
VALUES
  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000101', '44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'active', '2026-10-01', '2027-03-31', '44444444-0000-0000-0000-000000000002', CURRENT_TIMESTAMP);

-- 3. Seed Conversations & Messages
INSERT INTO conversations (id, listing_id, tenancy_request_id, status, created_by, created_at)
VALUES
  ('55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000101', '11111111-0000-0000-0000-000000000001', 'open', '33333333-0000-0000-0000-000000000001', CURRENT_TIMESTAMP);

INSERT INTO messages (id, conversation_id, sender_id, body, sent_at)
VALUES
  ('66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Hi, is room 101 available?', CURRENT_TIMESTAMP);

-- 4. Seed Reviews
INSERT INTO reviews (id, listing_id, author_id, tenancy_id, rating, title, body, status, created_at)
VALUES
  ('77777777-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000101', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 5, 'Awesome place!', 'Very clean environment and close to university campus.', 'published', CURRENT_TIMESTAMP);
