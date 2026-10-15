# M2 — Owner & Identity: Database Notes (Week 1, C1)

Branch: `M2_Anoj` · Owner: Anoj (Member 2) · Status: draft — pending approval.

> **Read-only review only.** No SQL was run, no migrations/seeds were touched `[AGENTS §0.1]`.
> Two reference files could not be read on this machine: `Haystax_Supabase_Initial_Migration.sql` and
> `~/haystax-live-schema.txt` are not present anywhere I can access.
> → `TODO(ask Anoj): provide the paths to the initial migration and the live-schema snapshot so the
> migration-vs-live comparison in section 3 can be completed.` The tables below are taken from AGENTS.md
> section 3 (which is itself sourced from those two files) and are marked `[AGENTS §3]`.

---

## 1. Tables the owner slice uses (already exist — no new tables `[AGENTS §0 rule 1]`)

UUID PKs, `timestamptz` `[AGENTS §3]`.

### `public.profiles`
| Column | Type / notes | Source |
|---|---|---|
| `id` | `uuid PK` FK → `auth.users(id)` | [AGENTS §3] |
| `display_name` | `text NOT NULL (2–120)` | [AGENTS §3] |
| `phone_number` | `text` nullable | [AGENTS §3] |
| `avatar_path` | `text` nullable (object path, never public URL) | [AGENTS §3] |
| `is_owner` | `bool NOT NULL default false` | [AGENTS §3] |
| `is_admin` | `bool NOT NULL default false` | [AGENTS §3] |
| `is_suspended` | `bool NOT NULL default false` | [AGENTS §3] |
| `suspension_reason` | `text` nullable | [AGENTS §3] |
| `created_at`, `updated_at`, `last_seen_at` | `timestamptz` | [AGENTS §3] |

Triggers/helpers (from AGENTS §3): signup trigger creates the `profiles` row
(`is_owner=false, is_admin=false, is_suspended=false`); trigger blocks non-admins from changing
`is_admin`/`is_suspended`/`suspension_reason` (does **not** block `is_owner`); helpers
`current_user_is_admin()`, `current_user_is_owner()`, `owns_listing(uuid)`.

### `public.boarding_listings`
| Column | Type / notes | Source |
|---|---|---|
| `id` | `uuid PK default gen_random_uuid()` | [AGENTS §3] |
| `owner_id` | `uuid NOT NULL FK profiles(id) ON DELETE RESTRICT` | [AGENTS §3] |
| `title` | `text NOT NULL (5–160)` | [AGENTS §3] |
| `description` | `text NOT NULL` | [AGENTS §3] |
| `address_line_1` | `text NOT NULL` | [AGENTS §3] |
| `address_line_2` | `text` nullable | [AGENTS §3] |
| `city` | `text NOT NULL` | [AGENTS §3] |
| `district` | `text` nullable | [AGENTS §3] |
| `location_label` | `text` nullable | [AGENTS §3] |
| `location` | `geography(Point,4326) NOT NULL` (PostGIS) | [AGENTS §3] |
| `price_amount` | `numeric(12,2) NOT NULL >= 0` | [AGENTS §3] |
| `currency_code` | `char(3) default 'LKR'` | [AGENTS §3] |
| `gender_policy` | `gender_policy NOT NULL default 'any'` (`any`,`female_only`,`male_only`) | [AGENTS §3] |
| `total_slots` | `int NOT NULL > 0` | [AGENTS §3] |
| `available_slots` | `int NOT NULL (0..total_slots)` | [AGENTS §3] |
| `status` | `listing_status NOT NULL default 'draft'` (`draft`,`pending_review`,`published`,`paused`,`removed`) | [AGENTS §3] |
| `moderation_note` | `text` nullable | [AGENTS §3] |
| `published_at`, `removed_at`, `created_at`, `updated_at` | `timestamptz` | [AGENTS §3] |

Trigger `validate_listing_owner` requires `is_owner=true`. RLS: published listings public; owners
read/insert/update/delete their own; admins everything `[AGENTS §3]`.

### `public.listing_photos`
`id uuid PK` · `listing_id FK (cascade)` · `storage_path text NOT NULL UNIQUE` · `alt_text` ·
`sort_order int default 0` · `is_primary bool default false` (partial unique index: one primary per
listing) · `is_approved bool default false` · timestamps. Bucket `listing-photos` is **private**;
path pattern `{listing_id}/{file}`; DB stores the object path, never a public URL `[AGENTS §3]`.

### Listing-adjacent (used by the editor) `[AGENTS §3]`
- `amenities(id, code unique, name, description, is_active, sort_order, ...)` — seed codes: `wifi`,
  `parking`, `furnished`, `air_conditioning`, `common_kitchen`, `laundry`, `water_included`,
  `electricity_included`, `attached_bathroom`, `security`.
- `listing_amenities(listing_id, amenity_id)` PK (both).
- `listing_rules(id, listing_id, rule_code, label, is_allowed, notes, unique(listing_id, rule_code))`.

### Known extra objects in the live DB (not in the migration file) `[AGENTS §0.1]`
`admin_daily_activity`, `listing_preferences`, `preference_catalog`, `user_settings` —
not owned by the owner slice; listed for awareness only.

---

## 2. Table → operation mapping (each owner-slice operation and what it touches)

| Operation (OpenAPI) | Table(s) / DB object | Notes |
|---|---|---|
| `GET /api/owner/auth/me` | `auth.users` (subject), `public.profiles` | Resolve `is_owner`/`is_admin`/`is_suspended` via token subject → profiles lookup `[AGENTS §3 auth]`. |
| `GET /api/owner/profile` | `public.profiles` | Own row only. |
| `PUT /api/owner/profile` | `public.profiles` | `display_name`, `phone_number`, `avatar_path` only; role flags never editable here. |
| Become owner (undecided) | `public.profiles.is_owner` | `TODO(ask Anoj)` — depends on the self-service vs approved decision (issue #1 in section 4). |
| `GET /api/owner/listings` | `public.boarding_listings` (+ photos via `listing_photos`, amenities via `listing_amenities`) | Scoped `WHERE owner_id = :tokenSubject`. |
| `POST /api/owner/listings` | `public.boarding_listings` | `owner_id` from token, never from body; insert requires `is_owner=true`. |
| `GET/PUT /api/owner/listings/{id}` | `public.boarding_listings` (+ photos, amenities, rules) | Ownership enforced by Spring (DB owner role bypasses RLS — issue #2). |
| `POST /api/owner/listings/{id}/publish` | `public.boarding_listings.status` → `pending_review` | Publish-time mandatory checks gap (section 4). |
| `POST /api/owner/listings/{id}/photos` | `public.listing_photos` + storage bucket `listing-photos` | Multipart; MIME/size validated before insert. |
| `DELETE /api/owner/listings/{id}/photos/{photoId}` | `public.listing_photos` | Own photo only; cascade is on listing delete. |
| `GET /api/owner/amenities` | `public.amenities` | `is_active` filter. |

---

## 3. Live-schema vs migration-file differences

**`TODO(ask Anoj)` — could not be completed:** the initial migration file and `~/haystax-live-schema.txt`
are not available on this machine (searched the repo, home dir, and common paths). AGENTS.md §0.1 states
the live DB has extra objects (`admin_daily_activity`, `listing_preferences`, `preference_catalog`,
`user_settings`); that is the only live-vs-migration delta I can assert without the files.

What the repo does contain, for the record:

- The **engagement migrations** (`backend/src/main/resources/db/migration/V3__engagement_tables.sql`,
  `V3_1__seed_engagement.sql`) exist and reference some of the same tables the owner slice reads
  (`listings` are `listing_id` targets for `tenancy_requests`, `tenancies`, `conversations`, `reviews`,
  `notifications`) — see section 5.
- `backend/src/main/resources/application.yml` confirms `ddl-auto: none` (no schema generation) and
  Supabase datasource env vars `HAYSTAX_DB_URL/_USER/_PASSWORD` — so the DB is externally managed
  (Supabase), consistent with "no new tables; tables already exist".
- The repo's `infra/postgres/init/00-extensions.sql` sets up local Postgres extensions used for local
  testing (PostGIS etc.), which is a local-test artifact, not the live schema.

---

## 4. Gap table (item · where in SQL · impact)

| # | Item | Where in SQL | Impact |
|---|---|---|---|
| 1 | Any authenticated user can set their own `is_owner=true` through the profiles update policy | `public.profiles` RLS update policy (live DB; per AGENTS.md §3 known issues) | Is this the intended "become an owner" flow? Blocks the `Become owner` API (currently `TODO(ask Anoj)`); affects Login/Register and dashboard role assumptions. **Reported, not fixed.** |
| 2 | Direct JDBC has no `auth.uid()`; escalation trigger and RLS helpers behave differently from Supabase-client calls; DB owner role bypasses RLS | `public.profiles` triggers, RLS helper functions, Spring datasource role | Spring must enforce ownership itself (check `owner_id` per request). Listing endpoints must never rely on RLS alone. **Reported, not fixed.** |
| 3 | `.env.example` has `HAYSTAX_JWT_SECRET` as a stub until M2 ships the real JwtService; how Supabase JWTs are verified is undecided (shared secret vs JWKS) | Spring Security config / JwtService (not yet written) | `GET /me` role resolution depends on this. Marked `TODO(ask Anoj)` in OpenAPI (`x-todo`). |
| 4 | Publish-time mandatory-field checks (photos, amenities) are not defined in SQL | `boarding_listings` status column; no SQL check exists | `POST /{id}/publish` must validate at the application layer (Weeks 2–3): at least one approved?/any photo, amenity requirements per team rules. OpenAPI marks it `x-todo`. |
| 5 | Photo approval flow (`is_approved`) has no owner-facing definition | `listing_photos.is_approved` | Display-only for the owner in Week 1; whether admin approval gates visibility is Naviru's moderation slice — confirm cross-slice at integration. |
| 6 | Storage path convention enforced only by application, not DB | `listing_photos.storage_path` UNIQUE but no path-shape constraint | Spring must write `{listing_id}/{file}` and never a public URL; DB stores object paths only. |
| 7 | `location` (PostGIS) not mapped in Week 1 | `boarding_listings.location geography(Point,4326)` | C2 explicitly skips it (`TODO`); a latitude/longitude DTO representation is contract-only until a spatial-mapping decision is made (do not add hibernate-spatial without asking). |

---

## 5. Overlap between `db/migration/V3__engagement_tables.sql` and the initial migration

The V3 file (`backend/src/main/resources/db/migration/V3__engagement_tables.sql`) creates engagement
tables **only** — `tenancy_requests`, `tenancies`, `conversations`, `conversation_participants`,
`messages`, `reviews`, `notifications`, `outbox_events`. It does **not** re-create the owner-slice
tables; instead it references them implicitly through `listing_id` foreign-key targets (in the SQL the
FKs are not declared — columns like `listing_id UUID NOT NULL` carry no `REFERENCES` clause).

Differences/notes relevant to the owner slice:

| Observation | Detail |
|---|---|
| No FK declarations | All `listing_id`, `tenant_id`, `owner_id`, `conversation_id`, `sender_id` columns in V3 are plain `UUID` with **no FOREIGN KEY clauses**, unlike the owner tables (e.g. `boarding_listings.owner_id ... FK profiles(id) on delete restrict`). Referential integrity for engagement rows is enforced at the app layer / by convention, not by the DB. |
| Helper function name | V3 uses `random_uuid()` (one `random_uuid()` call per table) instead of Postgres' built-in `gen_random_uuid()` used by the initial migration — see below. |
| Status values are app-level strings | `status VARCHAR(32)` in V3 tables (`submitted`, `active`, `open`, `published`, …) vs the owner slice's native enum types (`gender_policy`, `listing_status`). No shared enum in the DB. |
| No timestamps aliasing issue | V3's `created_at`/`updated_at` defaults to `CURRENT_TIMESTAMP`; owner tables use `timestamptz` — consistent enough, but V3 has no `updated_at` trigger for `tenancy_requests.status` etc. |

**`random_uuid()` vs `gen_random_uuid()`:** the V3 engagement file calls `random_uuid()`, which is not a
built-in Postgres function. This is a likely script-level inconsistency vs the initial migration's
`gen_random_uuid()` (the live Supabase DB presumably has a compatible function or the migration was
adjusted before running). Owner-slice code must not depend on either; uuids are generated
client-side/DB-side and read back — flag to Naviru if V3 replays cleanly in a fresh env.

**Initial migration overlap:** cannot fully enumerate until the initial-migration file is available
(`TODO(ask Anoj)`, section 3). From AGENTS.md §0.1 the initial migration is the source of truth for the
owner tables; V3 touches none of their columns, so no column-name overlap is expected. The only shared
surface is `listing_id`-style references, which V3 leaves unconstrained.

---

## 6. Moderation status the owner pages must **display** (not enforce) `[AGENTS §3]`

- Statuses + `moderation_note` come from the DB (`boarding_listings.status`, `moderation_note`).
- Warning at 50% of capacity in valid reports; "Under review" when reports equal capacity (visible to
  anyone viewing the listing); removed at 2× capacity; owner suspended after 3 removed listings.
- Owner pages: show status badge, `moderation_note`, and a suspended-account state when
  `profiles.is_suspended` is true.

## 7. Secrets / safety

- No `.env`, credentials, or SQL with secrets were read or printed; only variable **names** used
  (`HAYSTAX_DB_URL`, `HAYSTAX_DB_USER`, `HAYSTAX_DB_PASSWORD`, `HAYSTAX_JWT_SECRET`) `[AGENTS §0.1]`.
- No migrations, seeds, DROP/TRUNCATE/INSERT/UPDATE/DELETE were run against any database.
- No SQL was run at all for this checkpoint.