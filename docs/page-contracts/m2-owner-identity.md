# M2 — Owner & Identity: Page Contracts (Week 1, C1)

Slice owner: **Anoj (Member 2)**. Branch: `M2_Anoj`. Status: draft — pending Anoj's approval.

## 1. Scope

- Three pages: **Login/Register** (unified), **Owner Dashboard**, **Listing Editor**.
- Story coverage: `OWN-01..OWN-05`, `OWN-08`, `MOWN-01`, `MOWN-03`, `MOWN-04`, `MOWN-07`, `DUAL-01..DUAL-03`, `CROSS-01`.
- Cross-slice (not built here): `OWN-06`, `OWN-07` (messaging, confirming tenants → Member 3) `[AGENTS C1 story list]`.
- Admin (`ADM-*`) stories are not ours. The Admin Panel (`features/admin/`) is Naviru's — do not build, edit, or extend it `[AGENTS §1 roles, §2 forbidden]`.

## 2. Role rules (single account model, backend is source of truth)

| Role * | `is_owner` | `is_admin` | Notes |
|---|---|---|---|
| Anonymous | — | — | Not logged in. |
| Tenant | `false` | `false` | No `is_tenant` flag. |
| Owner | `true` | `false` | Dual-role users are just `is_owner=true`; ownership is checked **per listing**, never globally `[AGENTS §1 roles]`. |
| Admin | — | `true` | Cannot self-register. Admins can also be owners (`is_owner=true`). |

`is_owner` / `is_admin` / `is_suspended` / `owner_id` **always come from the server / JWT / DB — never from request bodies or client claims** `[AGENTS §0 rule 5]`. UI hiding is not security `[AGENTS §1 roles]`.

## 3. Role × access matrix

| Action | Anonymous | Tenant | Owner | Admin |
|---|---|---|---|---|
| View listing details / search | allow (public) `[OWN-08]` | allow | allow | allow |
| Request tenancy / send inquiry | deny (redirect to Login/Register) `[OWN-05][CROSS-01]` | allow `[OWN-05]` | allow `[OWN-05]` | allow `[OWN-05]` |
| Create / edit listing | deny | deny `[MOWN-01]` | allow (own only) `[MOWN-01]` | deny (moderation is Naviru's surface, not self-serve) `[AGENTS §1]` |
| Submit for publication | deny | deny | allow (own only) `[MOWN-03]` | deny |
| Upload / delete listing photo | deny | deny | allow (own only) `[MOWN-04]` | deny |
| Approve/suspend/remove listings, manage roles | deny | deny | deny | allow (Admin Panel only, Naviru) `[AGENTS §1]` |

Guards: `authGuard` (authenticated) and `ownerGuard` (authenticated **and** `is_owner=true`) — both are **proposals** in `frontend/src/app/core/`; do not create them this week without Anoj's OK `[AGENTS C3 design rules][TODO(ask Anoj): approve creating authGuard/ownerGuard in core/]`.

## 4. Post-login redirects (server-decided roles, never client-declared)

| Role after login | Destination |
|---|---|
| Admin (`is_admin=true`) | existing admin route `/admin` — read from `app.routes.ts`, do not invent `[AGENTS §1]` |
| Owner (`is_owner=true`, not admin) | Owner Dashboard `/owner/dashboard` (or `/owner` → dashboard) `[TODO(ask Anoj): exact owner base path — verify against discovery pages]` |
| Tenant (neither) | public home `/` — route `''` in `app.routes.ts` (discover) `[app.routes.ts][TODO(ask Anoj): confirm tenant lands on Naviru's home page]` |

## 5. Page 1 — Login/Register (unified) `[OWN-01]`

1. **Route & access**
   - Route: `/auth/login` `[TODO(ask Anoj): confirm route path; must not collide with Naviru's redirect-to-discover]`. Register shares the same page via a toggle.
   - Access: **anonymous** (also serves logged-in users who want to switch accounts → clear session first).
   - Redirect when already logged in: admin → `/admin`, owner → `/owner/dashboard`, tenant → `/` (section 4).

2. **Shows & actions**
   - Single auth surface: toggle between Login and Register `[OWN-01]`.
   - Shows: email, password (login); display name, email, phone number (optional), password, confirm password (register) `[OWN-01]`.
   - Actions: log in, register, "switch to register / login" toggle, error display.
   - Post-login routing per section 4.
   - Registering a user can never produce an admin: no role selection is shown, and server-side rules make self-registration `is_admin=false` `[AGENTS §1 roles][C1 key acceptance: self-registration cannot create an admin]`.

3. **Data fields** (shape from `GET /api/owner/auth/me` — see OpenAPI `MeResponse`)
   - Login request: `email`, `password`.
   - Register request: `display_name` (2–120 `[DB profiles.display_name]`), `email`, `password`, `phone_number` optional `[DB profiles.phone_number]`.
   - Response (after redirect): `id` `[DB profiles.id]`, `display_name`, `phone_number`, `avatar_path`, `is_owner` `[DB profiles.is_owner]`, `is_admin` `[DB profiles.is_admin]`, `is_suspended` `[DB profiles.is_suspended]`, `email`.

4. **API calls**
   - Supabase Auth handles register/login directly (not Spring): `POST /auth/v1/signup`, `POST /auth/v1/token?grant_type=password` (names depend on client library — `TODO(ask Anoj): which Supabase client library the Angular app uses`).
   - Then `GET /api/owner/auth/me` (Spring, with Supabase JWT) to resolve roles and drive redirect `[openapi-owner.yaml: /api/owner/auth/me]`.

5. **UI states**
   - loading (submit in flight), error (invalid credentials, email already registered, suspended account `[DB profiles.is_suspended]`, network), success (redirect), empty (n/a).

6. **Fixture data (Weeks 1–3)**
   - `mocks/users: tenant`, `owner`, `admin`, `suspended-owner` — see fixtures section 9.

7. **Acceptance checklist (testable)**
   - [ ] Register with valid data creates the user and lands at the correct page per role.
   - [ ] Registering cannot set any role flag; the created profile is `is_owner=false`, `is_admin=false` `[AGENTS §1 roles]`.
   - [ ] Login with admin credentials redirects to the admin route read from `app.routes.ts`.
   - [ ] Login with owner credentials redirects to the Owner Dashboard.
   - [ ] Login with tenant credentials redirects to `/`.
   - [ ] Suspended owner (`is_suspended=true`) sees a suspended-account state and no owner actions `[DB profiles.is_suspended][AGENTS §3 moderation display]`.
   - [ ] Invalid credentials / duplicate email show the error state, not a crash `[C1 key acceptance: safe error]`.

## 6. Page 2 — Owner Dashboard `[OWN-08][MOWN-01][MOWN-03][MOWN-07]`

1. **Route & access**
   - Route: `/owner/dashboard` (base path `TODO(ask Anoj)`, see section 4).
   - Access: `authGuard` + `ownerGuard`. Redirects: anonymous → Login/Register `[OWN-05]`; tenant → public home with an authorization error state `[C1 key acceptance: authorization error]`; admin → `/admin` (admin is redirected at login; if an admin reaches this route, show authorization error).
   - Aggregates the Profile and Listing Management surfaces `[MOWN-01][MOWN-03][MOWN-07]` — no finished forms this week `[AGENTS §0 rule 8]`; skeleton + states only.

2. **Shows & actions**
   - **Pending requests section** `[MOWN-07]`: incoming tenancy requests for the owner's listings, surfaced inline so the owner can act without leaving the dashboard. Data from Member 3's engagement slice (cross-slice: read their endpoint contract to align; do not import `[AGENTS §1 rule between members]`). Actions: open request, **confirm / reject** (Member 3's tenancy API handles the atomic `available_slots` update `[AGENTS C3 scope][MOWN-07]`).
   - **Owned listings section** `[MOWN-01]`: table of the owner's listings with moderation state, vacancy, and edit actions `[AGENTS §3]`.
   - Row: title `[DB boarding_listings.title]`, city `[DB boarding_listings.city]`, status badge `[DB boarding_listings.status]`, `moderation_note` when present `[DB boarding_listings.moderation_note]`, `available_slots` / `total_slots` `[DB boarding_listings.available_slots][DB boarding_listings.total_slots]`, price `[DB boarding_listings.price_amount][DB boarding_listings.currency_code]`, photo thumbnail (first `is_primary` photo or placeholder) `[DB listing_photos.is_primary]`.
   - Actions: **create listing** (→ Listing Editor, new) `[MOWN-01]`, **edit** (→ Listing Editor with `{id}`) `[MOWN-01]`, **submit for publication** (only when draft/paused) `[MOWN-03]`.
   - **Suspended state**: if `is_suspended=true` `[DB profiles.is_suspended]`, show suspended-account banner; no listing actions (admin moderation note: `suspension_reason` shown read-only) `[DB profiles.suspension_reason]`.

3. **Data fields** (from OpenAPI `ListingSummary` and `ProfileDto`; names match section 3 data facts)
   - `id`, `title`, `description`, `address_line_1`, `address_line_2`, `city`, `district`, `location_label`, `price_amount`, `currency_code`, `gender_policy`, `total_slots`, `available_slots`, `status`, `moderation_note`, `published_at`, `removed_at`, `created_at`, `updated_at` `[DB boarding_listings.*]`.
   - Photos: `id`, `storage_path` (object path, never a public URL `[DB listing_photos.storage_path]`), `alt_text`, `sort_order`, `is_primary`, `is_approved`.
   - Amenities (read-only list, editor uses them): `id`, `code`, `name`, `description`, `is_active` `[DB amenities.*]`; listing relation `[DB listing_amenities]`.
   - Rules: `id`, `rule_code`, `label`, `is_allowed`, `notes` `[DB listing_rules.*]`.

4. **API calls** (all from `openapi-owner.yaml`)
   - `GET /api/owner/auth/me` (profile + roles, on load).
   - `GET /api/owner/profile` (profile details).
   - `GET /api/owner/listings` (own listings only `[MOWN-01]`).
   - `POST /api/owner/listings/{id}/publish` (submit for publication `[MOWN-03]`).

5. **UI states**
   - loading (`skeleton-card` placeholders `[AGENTS C3 design rules]`), empty (no listings yet → CTA to create one `[MOWN-01]`), error (authorization error, network; stale/invalid ID never shows partial data), success, plus: **moderation state** (status + `moderation_note` badges `[AGENTS §3]`), **suspended account** (banner + read-only `suspension_reason`), warning at 50% of capacity in valid reports and "Under review" when reports equal capacity — **display only**, enforced by admin/moderation `[AGENTS §3]`.

6. **Fixture data (Weeks 1–3)**
   - 3–5 listings owned by the owner fixture — see fixtures section 9.

7. **Acceptance checklist (testable)**
   - [ ] Owner sees **only their own** listings, even with dual-role fixtures `[C1 key acceptance: owner sees only own listings]`.
   - [ ] Tenant reaching this route gets an authorization error, never a partial page `[C1 key acceptance: authorization error]`.
   - [ ] Each listing row shows status badge, `moderation_note` when present, and vacancy; `available_slots` is never negative and never above `total_slots` `[C1 key acceptance: vacancy bounds][DB boarding_listings CHECK]`.
   - [ ] Pending requests surface inline with confirm/reject actions (wired to Member 3's contract in Week 2+).
   - [ ] Suspended owner sees the suspended state and zero listing actions.
   - [ ] Loading / empty / error / success states all render via shared `state-view`.

## 7. Page 3 — Listing Editor `[MOWN-01][MOWN-03][MOWN-04]`

1. **Route & access**
   - Routes: `/owner/listings/new` (create) and `/owner/listings/:id` (edit) `[TODO(ask Anoj): confirm base path]`.
   - Access: `authGuard` + `ownerGuard`, plus ownership check server-side (Spring resolves `owner_id` from the token; the client never sends it `[AGENTS §0 rule 5]`).
   - A stale / invalid / not-owned `id` shows a safe error state and **never** updates another listing `[C1 key acceptance]`.

2. **Shows & actions** — skeleton only this week `[AGENTS §0 rule 8]`; the contract fixes the fields, states, and acceptance tests for Week 3.
   - Header: **listing title + location** always visible `[C1 key acceptance: edit screen shows listing title + location]` (`title` `[DB boarding_listings.title]`, `city`, `district`, `location_label` `[DB boarding_listings.*]`).
   - Fields (all mandatory except gender; team business answer `[AGENTS §3]`): `title` (5–160 `[DB boarding_listings.title]`), `description` `[DB boarding_listings.description]`, `address_line_1`, `address_line_2`, `city`, `district`, `location_label` `[DB boarding_listings.*]`, `location` coordinates (PostGIS point; **not mapped in Week 1** `[AGENTS C2 scope][TODO]`), `price_amount` (>=0 `[DB boarding_listings.price_amount]`), `currency_code` (default `LKR` `[DB boarding_listings.currency_code]`), `gender_policy` (`any` / `female_only` / `male_only`, default `any`, **optional** `[DB boarding_listings.gender_policy][AGENTS §3]`), `total_slots` (>0 `[DB boarding_listings.total_slots]`), `available_slots` (0..`total_slots` `[DB boarding_listings.available_slots]`), amenities (from `GET /api/owner/amenities`; codes wifi, parking, furnished, air_conditioning, common_kitchen, laundry, water_included, electricity_included, attached_bathroom, security `[AGENTS §3 seed codes]`), listing rules `[DB listing_rules]`, photos `[DB listing_photos]`.
   - Clients can never set `owner_id` `[AGENTS §0 rule 5]`; it is stripped server-side.
   - Actions: save draft `[MOWN-01]`, submit for publication `[MOWN-03]`, upload photo (multipart) `[MOWN-04]`, delete photo `[MOWN-04]`, cancel/back.
   - Upload feedback: progress, success, and error states; **MIME + size validation with visible feedback** `[C1 key acceptance: photo type/size validation]`; `storage_path` = `{listing_id}/{file}` in the private `listing-photos` bucket, DB stores the object path only `[AGENTS §3]`.

3. **Data fields** — `ListingDto` (full) per OpenAPI; same source tags as dashboard section 6.3 plus `location` coordinates (lat/lng), photo upload metadata (file, MIME, size, `is_primary`, `sort_order`).

4. **API calls**
   - `POST /api/owner/listings` (create; `owner_id` from token `[AGENTS §0 rule 5]`).
   - `GET /api/owner/listings/{id}` / `PUT /api/owner/listings/{id}` (owning owner only).
   - `POST /api/owner/listings/{id}/publish` `[MOWN-03]`.
   - `POST /api/owner/listings/{id}/photos` (multipart) `[MOWN-04]`.
   - `DELETE /api/owner/listings/{id}/photos/{photoId}` `[MOWN-04]`.
   - `GET /api/owner/amenities`.

5. **UI states**
   - loading, empty (n/a for edit: creates), error (not found / not owner / validation 422 / authorization 403 — safe error, never partial data), success (saved).
   - Page-specific: **upload progress / upload error**, **moderation state** (status read-only + `moderation_note` `[AGENTS §3]`), **suspended account**, vacancy bounds feedback (`available_slots` 0..`total_slots`) `[C1 key acceptance]`.

6. **Fixture data** — listings + photos + amenities, see section 9.

7. **Acceptance checklist (testable)**
   - [ ] Edit screen shows listing title + location `[C1 key acceptance]`.
   - [ ] Stale/invalid/foreign `id` → safe error; nothing else is ever updated `[C1 key acceptance]`.
   - [ ] Every mandatory field is required to save/submit except `gender_policy` `[AGENTS §3 team answer]`.
   - [ ] `available_slots` bound-checked to `0..total_slots`; UI and API reject out-of-range `[C1 key acceptance][DB CHECK]`.
   - [ ] Photo upload rejects wrong MIME/oversize with visible feedback `[C1 key acceptance]`.
   - [ ] Upload progress and error states render.
   - [ ] `owner_id` is never editable/sendable from the UI; server ignores any client-supplied value `[AGENTS §0 rule 5]`.
   - [ ] Publish only allowed for the owning owner; status transitions per DB enum `[MOWN-03]`.

## 8. Traceability note

Every field and every action above carries a source tag: `[DB table.column]`, `[story ID]`, `[AGENTS ...]`, or `[TODO...]`. Untagged items are not allowed `[AGENTS C1]`. Story titles are taken from AGENTS.md's story list; the full backlog (story descriptions) is not in this repo `[TODO(ask Anoj): provide backlog with OWN/MOWN/DUAL/CROSS story texts if approval of their wording is needed]`.

## 9. Fixtures (Weeks 1–3, frontend mocks only — nothing writes to the live DB `[AGENTS §0.1]`)

- `features/owner-identity/mocks/users`: one **tenant** (`is_owner=false, is_admin=false`), one **owner** (`is_owner=true`), one **admin** (`is_admin=true`), one **suspended owner** (`is_suspended=true, suspension_reason` set) `[DB profiles.*]`.
- `features/owner-identity/mocks/listings`: 3–5 listings owned by the owner fixture covering every `gender_policy` (`any`, `female_only`, `male_only`) and statuses `draft`, `pending_review`, `published`, plus one with `available_slots=0` `[AGENTS C3 scope][DB boarding_listings.*]`.
- `features/owner-identity/mocks/amenities`: seeded codes + names `[AGENTS §3 seed codes]`.
- Photos: `listing_photos` records (`storage_path` like `{listing_id}/{file}`, `is_primary`, `sort_order`, `is_approved`) + 3–5 small local placeholder images under `public/` or `src/assets` per the project's asset convention `[AGENTS C3 scope]`.
- Field names match section 3 data facts exactly; models defined in `owner-identity/models/` (aligned with, but **not imported from**, `features/discovery/models/listing.model.ts` `[AGENTS C3 design rules]`).
- Mock services (`mock-auth.service.ts`, `owner-api.service.ts`) sit behind one TypeScript interface; components depend only on the interface (Week 4 swaps mock → real) `[AGENTS C3 scope]`.