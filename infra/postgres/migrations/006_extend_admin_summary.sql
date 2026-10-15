drop view if exists public.admin_moderation_summary cascade;

create view public.admin_moderation_summary as
select
  (select count(*) from public.reports where status = 'submitted')::integer
    as submitted_report_count,
  (select count(*) from public.reports where status = 'under_review')::integer
    as under_review_report_count,
  (select count(*) from public.reports where status = 'resolved')::integer
    as resolved_report_count,
  (select count(*) from public.reports where status = 'rejected')::integer
    as rejected_report_count,
  (select count(*) from public.boarding_listings where status = 'pending_review')::integer
    as pending_listing_count,
  (select count(*) from public.boarding_listings where status = 'removed')::integer
    as removed_listing_count,
  (select count(*) from public.boarding_listings where status = 'published')::integer
    as published_listing_count,
  (select count(*) from public.tenancies where status = 'active')::integer
    as active_tenancy_count,
  (select count(*) from public.profiles)::integer
    as total_user_count,
  (select count(*) from public.profiles where is_suspended = true)::integer
    as suspended_user_count;
