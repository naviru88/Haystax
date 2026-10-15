-- Migration 005 — Add latitude and longitude to published_listing_search

drop view if exists public.published_listing_search cascade;

create view public.published_listing_search as
select
  bl.id,
  bl.title,
  bl.description,
  bl.city,
  bl.district,
  bl.location_label,
  bl.location,
  extensions.st_y(bl.location::extensions.geometry)::float8 as latitude,
  extensions.st_x(bl.location::extensions.geometry)::float8 as longitude,
  bl.price_amount,
  bl.currency_code,
  bl.gender_policy,
  bl.total_slots,
  bl.available_slots,
  bl.status,
  bl.published_at,
  p.display_name as owner_display_name,
  coalesce(
    jsonb_agg(distinct jsonb_build_object('id', a.id, 'code', a.code, 'name', a.name))
      filter (where a.id is not null),
    '[]'::jsonb
  ) as amenities,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', lp2.id,
          'storagePath', lp2.storage_path,
          'altText', lp2.alt_text,
          'sortOrder', lp2.sort_order,
          'isPrimary', lp2.is_primary
        )
        order by lp2.sort_order
      )
      from public.listing_photos lp2
      where lp2.listing_id = bl.id and lp2.is_approved = true
    ),
    '[]'::jsonb
  ) as photos,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', pc.id,
          'code', pc.code,
          'name', pc.name,
          'isRequired', lpref.is_required,
          'notes', lpref.notes
        )
        order by pc.sort_order
      )
      from public.listing_preferences lpref
      join public.preference_catalog pc on pc.id = lpref.preference_id
      where lpref.listing_id = bl.id and pc.is_active = true
    ),
    '[]'::jsonb
  ) as preferences
from public.boarding_listings bl
join public.profiles p on p.id = bl.owner_id
left join public.listing_amenities la on la.listing_id = bl.id
left join public.amenities a on a.id = la.amenity_id and a.is_active = true
where bl.status = 'published'
group by bl.id, p.display_name;
