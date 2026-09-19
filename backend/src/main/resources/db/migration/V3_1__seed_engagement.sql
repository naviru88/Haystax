-- ====================================================================
-- Flyway Seed V3_1: Seed Data for Member 3 (Engagement & Insights)
-- ====================================================================

-- 1. Seed Tenancy Requests
INSERT INTO tenancy_requests (id, listing_id, student_id, owner_id, move_in_date, status, notes, created_at)
VALUES
  ('tn-001', 'listing-101', 'student-01', 'owner-01', '2026-10-01', 'APPROVED', 'Looking forward to moving in!', NOW() - INTERVAL '5 days'),
  ('tn-002', 'listing-102', 'student-02', 'owner-01', '2026-10-15', 'PENDING', 'Is the deposit refundable?', NOW() - INTERVAL '2 days'),
  ('tn-003', 'listing-101', 'student-03', 'owner-01', '2026-11-01', 'PENDING', 'Interested in a 6-month stay.', NOW() - INTERVAL '1 day');

-- 2. Seed Messages & Notifications
INSERT INTO messages_notifications (id, type, sender_id, recipient_id, content, is_read, created_at)
VALUES
  ('msg-001', 'MESSAGE', 'student-01', 'owner-01', 'Hi, is room 204 still available for October?', TRUE, NOW() - INTERVAL '6 days'),
  ('msg-002', 'MESSAGE', 'owner-01', 'student-01', 'Yes it is! Feel free to send a booking inquiry.', TRUE, NOW() - INTERVAL '6 days'),
  ('msg-003', 'NOTIFICATION', 'SYSTEM', 'student-01', 'Your tenancy request tn-001 has been APPROVED.', FALSE, NOW() - INTERVAL '5 days');

-- 3. Seed Reviews & Ratings
INSERT INTO boarding_reviews (id, listing_id, student_id, rating, comment, owner_response, created_at)
VALUES
  ('rev-001', 'listing-101', 'student-04', 5, 'Great location near campus, clean rooms and reliable Wi-Fi.', 'Thanks for the review!', NOW() - INTERVAL '10 days'),
  ('rev-002', 'listing-101', 'student-05', 4, 'Spacious room, quiet study environment. Water pressure could be better.', NULL, NOW() - INTERVAL '8 days');

-- 4. Seed Analytics Summaries
INSERT INTO analytics_summaries (id, owner_id, total_inquiries, total_bookings, occupancy_rate, estimated_revenue, average_rating, summary_date, created_at)
VALUES
  ('an-001', 'owner-01', 24, 18, 85.50, 45000.00, 4.70, CURRENT_DATE - INTERVAL '1 day', NOW());
