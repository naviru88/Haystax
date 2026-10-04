-- Haystax — M1 test seed
begin;

-- 1. Grant owner capability to the two test users

update public.profiles
set is_owner = true
where id in (
  '8be5a566-5c73-4ef6-a96f-99432184672c',   -- binuwara70
  '1386d923-e39a-45ae-af11-ca99b704b2c6'    -- jiko09867
);

-- 2. Insert 7 listings
insert into public.boarding_listings (
  id, owner_id, title, description,
  address_line_1, city, district, location_label,
  location, price_amount, currency_code, gender_policy,
  total_slots, available_slots, status, published_at
) values
  -- 1. Colombo executive suite — owner: jiko09867
  ('1a2b3c4d-0001-4000-8000-000000000001',
   '1386d923-e39a-45ae-af11-ca99b704b2c6',
   'Executive Suite in Colombo 03',
   'Premium fully-serviced apartment in the heart of the business district. Ideal for executives.',
   'No. 45, R.A. De Mel Mawatha', 'Colombo', 'Western', 'Colombo 03',
   extensions.st_setsrid(extensions.st_makepoint(79.8500, 6.9147), 4326)::extensions.geography,
   72000.00, 'LKR', 'any', 1, 1, 'published', now()),

  -- 2. Colombo luxury studio — owner: jiko09867
  ('1a2b3c4d-0006-4000-8000-000000000006',
   '1386d923-e39a-45ae-af11-ca99b704b2c6',
   'Luxury Studio in Colombo 05',
   'Newly built studio with modern fittings. Close to restaurants, gyms, and public transport.',
   'No. 12, Kirulapone Avenue', 'Colombo', 'Western', 'Colombo 05',
   extensions.st_setsrid(extensions.st_makepoint(79.8680, 6.8940), 4326)::extensions.geography,
   48000.00, 'LKR', 'any', 2, 2, 'published', now()),

  -- 3. Modern apartment near university — owner: binuwara70
  ('1a2b3c4d-0002-4000-8000-000000000002',
   '8be5a566-5c73-4ef6-a96f-99432184672c',
   'Modern Apartment near University of Colombo',
   'Bright 2-bedroom apartment with attached bathroom and kitchen. Walking distance to campus and public transport.',
   'No. 88, Reid Avenue', 'Colombo', 'Western', 'Colombo 07',
   extensions.st_setsrid(extensions.st_makepoint(79.8612, 6.9271), 4326)::extensions.geography,
   35000.00, 'LKR', 'any', 3, 2, 'published', now()),

  -- 4. Female-only Kandy boarding — owner: binuwara70
  ('1a2b3c4d-0003-4000-8000-000000000003',
   '8be5a566-5c73-4ef6-a96f-99432184672c',
   'Female-Only Boarding in Kandy',
   'Quiet boarding house exclusively for female students. Common kitchen and study area.',
   'No. 5, Peradeniya Road', 'Kandy', 'Central', 'Peradeniya',
   extensions.st_setsrid(extensions.st_makepoint(80.6337, 7.2906), 4326)::extensions.geography,
   22000.00, 'LKR', 'female_only', 6, 4, 'published', now()),

  -- 5. Male-only Galle room — owner: jiko09867
  ('1a2b3c4d-0004-4000-8000-000000000004',
   '1386d923-e39a-45ae-af11-ca99b704b2c6',
   'Male-Only Room near Galle Fort',
   'Single room for a working professional. Shared bathroom, water and electricity included.',
   'No. 3, Church Street', 'Galle', 'Southern', 'Galle Fort',
   extensions.st_setsrid(extensions.st_makepoint(80.2210, 6.0535), 4326)::extensions.geography,
   18000.00, 'LKR', 'male_only', 2, 0, 'published', now()),

  -- 6. Negombo 3-bed house — owner: binuwara70
  ('1a2b3c4d-0005-4000-8000-000000000005',
   '8be5a566-5c73-4ef6-a96f-99432184672c',
   'Spacious 3-Bedroom House in Negombo',
   'Family-friendly house with garden and parking. Close to the beach and main road.',
   'No. 22, Beach Road', 'Negombo', 'Western', 'Negombo Beach Road',
   extensions.st_setsrid(extensions.st_makepoint(79.8358, 7.2083), 4326)::extensions.geography,
   55000.00, 'LKR', 'any', 4, 3, 'published', now()),

  -- 7. Kandy lakeside apartment — owner: binuwara70
  ('1a2b3c4d-0007-4000-8000-000000000007',
   '8be5a566-5c73-4ef6-a96f-99432184672c',
   'Lakeside Apartment in Kandy',
   'Peaceful apartment overlooking the Kandy lake. Ideal for students or working professionals.',
   'No. 9, Sangaraja Mawatha', 'Kandy', 'Central', 'Kandy Lake',
   extensions.st_setsrid(extensions.st_makepoint(80.6417, 7.2906), 4326)::extensions.geography,
   28000.00, 'LKR', 'any', 3, 1, 'published', now())
on conflict (id) do nothing;

-- 3. Link amenities
with amenity_links(listing_id, amenity_code) as (values
  -- Executive suite
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'furnished'),
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'air_conditioning'),
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'security'),
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'attached_bathroom'),
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'parking'),
  -- Luxury studio
  ('1a2b3c4d-0006-4000-8000-000000000006'::uuid, 'wifi'),
  ('1a2b3c4d-0006-4000-8000-000000000006'::uuid, 'furnished'),
  ('1a2b3c4d-0006-4000-8000-000000000006'::uuid, 'air_conditioning'),
  -- Modern apartment
  ('1a2b3c4d-0002-4000-8000-000000000002'::uuid, 'wifi'),
  ('1a2b3c4d-0002-4000-8000-000000000002'::uuid, 'furnished'),
  ('1a2b3c4d-0002-4000-8000-000000000002'::uuid, 'attached_bathroom'),
  -- Female-only Kandy
  ('1a2b3c4d-0003-4000-8000-000000000003'::uuid, 'wifi'),
  ('1a2b3c4d-0003-4000-8000-000000000003'::uuid, 'common_kitchen'),
  ('1a2b3c4d-0003-4000-8000-000000000003'::uuid, 'security'),
  -- Male-only Galle
  ('1a2b3c4d-0004-4000-8000-000000000004'::uuid, 'water_included'),
  ('1a2b3c4d-0004-4000-8000-000000000004'::uuid, 'electricity_included'),
  -- Negombo house
  ('1a2b3c4d-0005-4000-8000-000000000005'::uuid, 'wifi'),
  ('1a2b3c4d-0005-4000-8000-000000000005'::uuid, 'furnished'),
  ('1a2b3c4d-0005-4000-8000-000000000005'::uuid, 'parking'),
  -- Kandy lakeside
  ('1a2b3c4d-0007-4000-8000-000000000007'::uuid, 'wifi'),
  ('1a2b3c4d-0007-4000-8000-000000000007'::uuid, 'common_kitchen'),
  ('1a2b3c4d-0007-4000-8000-000000000007'::uuid, 'security')
)
insert into public.listing_amenities (listing_id, amenity_id)
select al.listing_id, a.id
from amenity_links al
join public.amenities a on a.code = al.amenity_code
on conflict do nothing;

-- 4. Link preferences (optional, for a few listings)
with pref_links(listing_id, pref_code, is_required) as (values
  ('1a2b3c4d-0002-4000-8000-000000000002'::uuid, 'university_students', false),
  ('1a2b3c4d-0002-4000-8000-000000000002'::uuid, 'non_smokers', true),
  ('1a2b3c4d-0002-4000-8000-000000000002'::uuid, 'quiet_hours', false),
  ('1a2b3c4d-0003-4000-8000-000000000003'::uuid, 'female_only', true),
  ('1a2b3c4d-0003-4000-8000-000000000003'::uuid, 'university_students', false),
  ('1a2b3c4d-0004-4000-8000-000000000004'::uuid, 'male_only', true),
  ('1a2b3c4d-0004-4000-8000-000000000004'::uuid, 'working_professionals', false),
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'working_professionals', false),
  ('1a2b3c4d-0001-4000-8000-000000000001'::uuid, 'no_pets', true)
)
insert into public.listing_preferences (listing_id, preference_id, is_required)
select pl.listing_id, pc.id, pl.is_required
from pref_links pl
join public.preference_catalog pc on pc.code = pl.pref_code
on conflict do nothing;

-- 5. Add reviews (for the rating summary view)
commit;

-- Verification
select 'boarding_listings' as tbl, count(*) from public.boarding_listings
union all
select 'listing_amenities', count(*) from public.listing_amenities
union all
select 'listing_preferences', count(*) from public.listing_preferences
union all
select 'published_listing_search (view)', count(*) from public.published_listing_search;
