-- ====================================================================
-- Flyway Seed V3_1: Seed Data Aligned with Official Supabase UUID Schema
-- ====================================================================

-- 1. Seed Tenancy Requests
INSERT INTO public.tenancy_requests (id, listing_id, tenant_id, message, status, created_at)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000101', 'u1111111-0000-0000-0000-000000000001', 'Interested in moving in next month.', 'submitted', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Tenancies
INSERT INTO public.tenancies (id, listing_id, owner_id, tenant_id, tenancy_request_id, status, start_date, end_date, confirmed_by, created_at)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000101', 'u1111111-0000-0000-0000-000000000002', 'u1111111-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'active', '2026-10-01', '2027-03-31', 'u1111111-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Conversations & Messages
INSERT INTO public.conversations (id, listing_id, tenancy_request_id, status, created_by, created_at)
VALUES
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000101', 'a1b2c3d4-0000-0000-0000-000000000001', 'open', 'u1111111-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, conversation_id, sender_id, body, sent_at)
VALUES
  ('m1111111-0000-0000-0000-000000000001', 'c1111111-0000-0000-0000-000000000001', 'u1111111-0000-0000-0000-000000000001', 'Hi, is room 101 available?', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Reviews
INSERT INTO public.reviews (id, listing_id, author_id, tenancy_id, rating, title, body, status, created_at)
VALUES
  ('r1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000101', 'u1111111-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002', 5, 'Awesome place!', 'Very clean environment and close to university campus.', 'published', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
