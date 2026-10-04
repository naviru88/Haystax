# AGENTS.md — Haystax, Member 2 (Owner & Identity), WEEK 1 ONLY

You are an AI coding agent working for **Anoj (Member 2)** on the Haystax monorepo.
Read this whole file before doing anything. It is the source of truth for Week 1.

---

## 0. Hard rules (never break)

1. **Do not invent.** Do not add endpoints, fields, tables, enums, libraries, or pages that are not listed in this file or in the source files it points to. If something is missing or ambiguous, write `TODO(ask Anoj): <question>` and STOP that item. Do not guess.
2. **Work in checkpoints (section 4).** Week 1 has exactly **3 commits**. After each commit you STOP, print the CHECKPOINT report (section 5), and wait for Anoj to approve. Never start the next commit on your own.
3. **Edit only your own paths** (section 2). Shared folders need Anoj's explicit OK per file.
4. **Never push.** Anoj pushes. Never touch `develop` or `main`. No force-push, no rebase, no amend unless asked.
5. **Never trust the client for roles or ownership.** `is_owner`, `is_admin`, `owner_id` come from the server/DB/JWT, never from request bodies.
6. **Do not guess versions.** Run the version commands and report them. Use what is installed.
7. **Secrets:** see section 0.1.
8. **Week 1 = contracts, review, setup, skeletons, fixtures.** Do NOT implement full CRUD, photo upload logic, or finished page UIs (Weeks 2–3).
9. **No extra commits.** Do not split into many small commits, and do not add "polish" or "cleanup" commits.

## 0.1 Secrets and the shared Supabase database

- The team shares one live Supabase database. Credentials live only in `backend/.env` (git-ignored). **Never read, print, quote, copy into any file, or commit them.** If you need a value, name the variable (e.g. `HAYSTAX_DB_URL`) and ask Anoj.
- Do not run `cat .env`, `env`, or `printenv`. Do not use `source` on `.env` (the password contains characters that break the shell).
- Before every commit run `git status --short` and confirm no `.env`, credentials file, backup file or SQL file with secrets is staged.
- **Do not run migrations, seeds, DROP, TRUNCATE, INSERT, UPDATE or DELETE against the live database.** Read-only `SELECT` on the catalog is allowed only if Anoj asks. Anoj starts the backend himself (section 6); you do not start it against the live DB unless told to.
- The initial migration (`Haystax_Supabase_Initial_Migration.sql`) and Anoj's live-schema snapshot (`~/haystax-live-schema.txt`, outside the repo) are the source of truth for tables. The live DB has **extra objects not in the migration file**: `admin_daily_activity`, `listing_preferences`, `preference_catalog`, `user_settings`. Ask Anoj for the paths of both files and read them before C1.

---

## 1. Project context (extracted facts — use these, not memory)

**Haystax** = boarding (rental room) marketplace. Angular SPA + Spring Boot API + Supabase PostgreSQL (PostGIS). Monorepo: `frontend/`, `backend/`, `notification-service/`, `infra/`, `docs/`.

**Team slices:**
- Member 1 (Naviru): Public Discovery (Home, Search, Listing Details, Recommendations) **and the Admin Panel** (it was moved to him and he has already built part of it in `frontend/src/app/features/admin/`).
- **Member 2 (Anoj, YOU work for him): Owner & Identity — exactly 3 pages: Login/Register (unified), Owner Dashboard, Listing Editor.** Plus the owner/identity backend and its tables.
- Member 3 (Binuwara): Engagement — Booking/Inquiry, Messaging/Notifications, Reviews & Ratings, Analytics.

**The Admin Panel is NOT yours.** Do not build, edit, extend, restyle or duplicate anything in `features/admin/`. Do not create admin endpoints (no `/api/owner/admin/**`), admin pages or moderation actions. Your only admin-related duties: the JWT/role model must expose `is_admin` correctly, and login must redirect admin users to the existing admin route (read the route path from `app.routes.ts`; do not invent it).

**Rule between members:** communication only via versioned REST endpoints or events. No importing another member's source, no reading another member's tables from your code. Read other members' files to *align*, never to import.

**Roles (one account model):**
- Tenant: `is_owner=false`, `is_admin=false`. (No `is_tenant` flag.)
- Owner: `is_owner=true`. A dual-role user is also just `is_owner=true`; ownership is checked **per listing**, never globally.
- Admin: `is_admin=true`. Cannot self-register.
- The backend is the source of truth for authorization. UI hiding is not security.

**Week 1 deliverables (WBS, Member 2, adjusted):**
1. The 3 page contracts and role rules.
2. Review of the 3 owned table groups against the live DB (they already exist; no new tables).
3. Spring Boot owner-slice skeleton connected to the Supabase PostgreSQL (read-only smoke check).
4. Local fixtures: mock student(tenant), owner and admin users, mock listings, local image fixtures (as frontend mocks; nothing is written to the live DB).
5. Minimal Angular skeleton for `features/owner-identity/` that matches the team's existing design.

Later (do NOT build now): Week 2 listing CRUD, photo upload, owner profile, role-boundary tests. Week 3 full Angular pages against the real local API. Week 4 merge.

---

## 2. Paths you may edit

| Path | Rule |
|---|---|
| `frontend/src/app/features/owner-identity/**` | Yours |
| `backend/src/main/java/com/haystax/owner/**` | Yours |
| `backend/src/test/java/com/haystax/owner/**` | Yours |
| `docs/page-contracts/m2-owner-identity.md` (empty file, fill it) | Yours |
| `docs/api-contracts/openapi-owner.yaml` (empty file, fill it) | Yours |
| `docs/m2-db-notes.md` (new) | Yours |
| `frontend/src/app/app.routes.ts`, `frontend/src/app/shared/**`, `frontend/src/app/core/**`, `frontend/src/styles.css`, `backend/pom.xml`, `backend/src/main/resources/application*.yml`, `backend/.../config/**`, `backend/.../common/**`, `infra/**` | **Shared — show the exact diff and ask first** |
| `features/admin/**`, `features/discovery/**`, `features/engagement/**`, `.../engagement/**`, `backend/src/main/resources/db/migration/**`, `notification-service/**` | **FORBIDDEN** |

Never touch the two broken files `frontend/canvas,<CR>` and `frontend/svg,<CR>` (names end in a carriage return; hidden on this machine by sparse-checkout). Never create files whose names contain `? * : " < > |` or trailing commas.

Naming: kebab-case files; PascalCase classes; backend DTOs `*Dto`; routes `/api/owner/...`; events `domain.action`.

---

## 3. Data facts for the tables you own

PostgreSQL via Supabase. UUID PKs, `timestamptz`.

**Auth (resolved): Supabase Auth.** Identity is in `auth.users`; `public.profiles.id` references `auth.users(id)`. There is no password table; Spring does not store or hash passwords. A trigger creates the `profiles` row on signup (new users: `is_owner=false`, `is_admin=false`, `is_suspended=false`). A trigger blocks non-admins from changing `is_admin`, `is_suspended`, `suspension_reason` (it does NOT block `is_owner`). Helper SQL functions exist: `current_user_is_admin()`, `current_user_is_owner()`, `owns_listing(uuid)`. Spring's role: validate the Supabase-issued JWT and resolve `is_owner`/`is_admin` from `public.profiles`. Do not invent another token scheme.

Known issues — **report them in C1 notes, do not fix:**
1. Any authenticated user can set their own `is_owner=true` through the profiles update policy. Is this the intended "become an owner" flow?
2. A direct JDBC connection has no `auth.uid()`, so the escalation trigger and RLS helper functions behave differently from Supabase-client calls; Spring must enforce ownership itself because the DB owner role bypasses RLS.
3. The `.env.example` has `HAYSTAX_JWT_SECRET` as a stub "until Member 2 ships the real JwtService". How Supabase JWTs are verified (shared secret vs JWKS) is undecided.

### profiles
`id uuid PK (FK auth.users)`, `display_name text NOT NULL (2–120)`, `phone_number`, `avatar_path`, `is_owner bool NOT NULL default false`, `is_admin bool NOT NULL default false`, `is_suspended bool NOT NULL default false`, `suspension_reason`, `created_at`, `updated_at`, `last_seen_at`. There is **no `owner_profiles` table**; owner capability is `is_owner`.

### boarding_listings
`id uuid PK default gen_random_uuid()`, `owner_id uuid NOT NULL FK profiles(id) on delete restrict`, `title text NOT NULL (5–160)`, `description text NOT NULL`, `address_line_1 NOT NULL`, `address_line_2`, `city NOT NULL`, `district`, `location_label`, `location geography(Point,4326) NOT NULL`, `price_amount numeric(12,2) NOT NULL >=0`, `currency_code char(3) default 'LKR'`, `gender_policy gender_policy NOT NULL default 'any'` (values `any`, `female_only`, `male_only`), `total_slots int NOT NULL >0`, `available_slots int NOT NULL (0..total_slots)`, `status listing_status NOT NULL default 'draft'` (values `draft`, `pending_review`, `published`, `paused`, `removed`), `moderation_note`, `published_at`, `removed_at`, `created_at`, `updated_at`.
Trigger `validate_listing_owner` requires the owner to have `is_owner=true`. RLS: published listings are public; owners read/insert/update/delete their own; admins everything.
Team business answer: **gender preference is optional; every other listing field is mandatory** (price, amenities, capacity, photos, address, location coordinates). One owner can have many listings. Clients can never set `owner_id`.

### listing_photos
`id`, `listing_id FK (cascade)`, `storage_path text NOT NULL UNIQUE`, `alt_text`, `sort_order int default 0`, `is_primary bool default false` (partial unique index: one primary per listing), `is_approved bool default false`, `created_at`, `updated_at`. Storage bucket `listing-photos` is private; path pattern `{listing_id}/{file}`. DB stores the object path, never a public URL.

### Related (listing-adjacent, used by the editor)
`amenities(id, code unique, name, description, is_active, sort_order, ...)`, `listing_amenities(listing_id, amenity_id)` PK both, `listing_rules(id, listing_id, rule_code, label, is_allowed, notes, unique(listing_id, rule_code))`. Seed amenity codes: wifi, parking, furnished, air_conditioning, common_kitchen, laundry, water_included, electricity_included, attached_bathroom, security.

### Moderation status you must DISPLAY (not enforce — admin is Naviru's)
Listing statuses and `moderation_note` come from the DB. Rules the team stated: warning at 50% of capacity in valid reports; "Under review" when reports equal capacity (visible to anyone viewing the listing); removed at 2x capacity; owner suspended after 3 removed listings. The owner pages must show listing `status`, `moderation_note`, and a suspended-account state if `is_suspended`.

---

## 4. The 3 commits (do in order; stop after each)

Time budget (7h): C1 ≈ 2.5h, C2 ≈ 2.5h, C3 ≈ 2h.

### C1 — Docs only: contracts + DB notes
Message: `docs(owner): week 1 page contracts, API contract and DB notes`
Files: `docs/page-contracts/m2-owner-identity.md`, `docs/api-contracts/openapi-owner.yaml`, `docs/m2-db-notes.md`. No code.

**Page contracts (3 pages: Login/Register, Owner Dashboard, Listing Editor).** For each page document:
1. Route and who may access (anonymous / tenant / owner / admin) and redirect when denied.
2. What it shows and its actions (only what the stories below imply).
3. Data fields (names must match section 3).
4. API calls (names from the OpenAPI file).
5. UI states: loading, empty, error, success, plus page-specific ones (upload progress/error, moderation state, suspended account, authorization error).
6. Fixture data used in Weeks 1–3.
7. A testable acceptance checklist.
Add a **Role rules** table (role × page/action → allow/deny). Guards: `authGuard`, `ownerGuard` (needs `is_owner`). Post-login redirects: admin → existing admin route, owner → Owner Dashboard, tenant → public home (route from `app.routes.ts`; if unclear `TODO(ask Anoj)`).
Stories to cover (only these): OWN-01..OWN-05, OWN-08; MOWN-01, MOWN-03, MOWN-04, MOWN-07; DUAL-01..DUAL-03; CROSS-01. OWN-06/OWN-07 (messaging, confirming tenants) belong to Member 3: mark cross-slice, not yours. ADM-* stories are not yours.
Key acceptance points: owner sees only own listings; edit screen shows listing title + location; stale/invalid ID gives a safe error and never updates another listing; self-registration cannot create an admin; photo type/size validation feedback; vacancy never negative or above capacity.
**Traceability rule:** every field and every action in the contract must carry a source tag: `[DB table.column]`, `[story ID]`, or `[TODO]`. Untagged items are not allowed.

**OpenAPI (design only).** Exactly these operations, nothing more:

| Operation | Method + path | Access |
|---|---|---|
| Current user | GET `/api/owner/auth/me` | authenticated; returns profile + `is_owner`/`is_admin`/`is_suspended` |
| Owner profile get/update | GET, PUT `/api/owner/profile` | authenticated; cannot change role flags |
| Become owner | `TODO(ask Anoj)` — depends on the is_owner decision above | |
| List my listings | GET `/api/owner/listings` | owner (own only) |
| Create listing | POST `/api/owner/listings` | owner; `owner_id` from token |
| Get/Update my listing | GET, PUT `/api/owner/listings/{id}` | owning owner |
| Submit for publication | POST `/api/owner/listings/{id}/publish` | owning owner |
| Upload photo | POST `/api/owner/listings/{id}/photos` | owning owner; multipart, validate MIME/size |
| Delete photo | DELETE `/api/owner/listings/{id}/photos/{photoId}` | owning owner |
| List amenities | GET `/api/owner/amenities` | authenticated |

Register and login are done by **Supabase Auth** (client or Supabase API), not by Spring: do not define `/auth/register` or `/auth/login`. Document in the contract how the Angular app registers/logs in with Supabase and then calls Spring with the Supabase JWT (`TODO(ask Anoj)` for the exact client library choice).
For each operation: request/response schema, status codes (200/201/400/401/403/404/409/422), shared error shape. Mark uncertain items `x-todo`.

**DB notes (`docs/m2-db-notes.md`).** Only: (a) which existing tables/columns/policies/functions the owner slice uses, mapped to each operation; (b) a gap table (item, where in SQL, impact) including the 3 known issues above, publish-time mandatory-field checks (photos, amenities), photo approval flow, storage path convention; (c) differences between the live-schema snapshot and the migration file; (d) overlap between `db/migration/V3__engagement_tables.sql` and the initial migration. Do not edit migrations. Do not run SQL.

### C2 — Backend skeleton
Message: `feat(owner): backend owner slice skeleton with health check`
Scope (nothing else):
- Check `backend/pom.xml` for existing dependencies first. If a needed one is missing, **list it and ask** before adding. Do not add hibernate-spatial/PostGIS libraries without asking: do not map the `location` column in Week 1 (`TODO`).
- Package `com.haystax.owner` with `controller`, `service`, `repository`, `dto`, `mapper`. Stub classes only: `OwnerAuthController` (`/me`), `OwnerProfileController`, `ListingWriteController`, `AuthService`, `ListingWriteService`, `PhotoUploadService`, `ProfileRepository`, `ListingWriteRepository`, `ListingPhotoRepository`.
- DTO records matching the C1 OpenAPI file exactly (field names from section 3).
- JPA entities mapped to the EXISTING tables `profiles`, `boarding_listings` (without `location`), `listing_photos`, `amenities`. No schema generation: never `ddl-auto=update/create`.
- One public endpoint `GET /api/owner/health` returning `{"status":"ok","slice":"owner"}`.
- Stub endpoints (`/me`, listings, photos) return `501 Not Implemented` with the shared error shape. No business logic.
- One smoke test that boots the context. If it needs the live DB, it must use read-only operations only and skip cleanly when `HAYSTAX_DB_URL` is not set.
- Do not edit `pom.xml`, `application*.yml`, `SecurityConfig` or `config/**` without showing the diff and asking.

### C3 — Angular skeleton + fixtures (design must match the team's)
Message: `feat(owner): owner-identity frontend skeleton with mock fixtures`

**Step 0 — Design audit (before writing any code).** Read and summarise in the CHECKPOINT report: `src/styles.css` (tokens, Tailwind setup), `components.json`, `.postcssrc.json`, `shared/layout/app-shell/*` (navigation, layout), `shared/components/*` (`page-header`, `state-view`, `skeleton-card`, `listing-card`, `rating-stars`), `app.routes.ts`, `features/admin/admin.routes.ts` + one admin page and one discovery page (how they use the shared components, spacing, colours, typography, buttons, forms, tables). Report which Tailwind classes/patterns they use for buttons, inputs, cards, badges and page layout.

**Design rules (strict):**
- Reuse the shared components: `page-header` for page titles, `state-view` for loading/empty/error, `skeleton-card` for loading placeholders, `listing-card` where a listing card is shown. Do not rebuild equivalents.
- Use the same styling approach as the existing pages (same Tailwind classes, colours, spacing, radius, fonts). **No new CSS framework, no new fonts, no new colour palette, no component library.** No custom CSS unless the existing pages also use it.
- Same structure as existing features: standalone components, `.ts` + `.html` pair, lazy-loaded `owner-identity.routes.ts` (copy the pattern of `admin.routes.ts`), a mock-data service + api service behind the same interface (copy the pattern of `discovery-api.service.ts` / `admin-api.service.ts`).
- Align field names with `features/discovery/models/listing.model.ts` by reading it; **do not import** from another feature. Define your own models in `owner-identity/models/`.
- Do not edit shared components. If one is missing something, write `TODO(ask Anoj)`.
- `app.routes.ts` and the app-shell navigation are shared: show the exact diff for adding the owner routes/links and ask before applying.

**Scope:**
- Folders inside `features/owner-identity/`: `auth/` (login/register page), `owner-dashboard/`, `listing-editor/`, `services/`, `mocks/`, `models/`, `owner-identity.routes.ts`.
- Each page: a minimal real component showing its title, the layout skeleton from the contract, and its UI states (loading/empty/error/success) switchable via the mock service. No finished forms or full UI.
- `services/mock-auth.service.ts` and `owner-api.service.ts` behind the **same TypeScript interface**; components depend only on the interface (Week 4 swaps mock → real).
- Fixtures in `mocks/`: users (one tenant, one owner, one admin, one suspended owner), 3–5 listings owned by the owner covering every `gender_policy` and several statuses (`draft`, `pending_review`, `published`, one with `available_slots=0`), amenities, photo records, plus 3–5 small local placeholder images in `public/` or `src/assets` per the project's existing asset convention (license-safe or generated, small). Field names exactly as section 3.
- `ownerGuard` / `authGuard` are shared (`core/`): propose them, ask before creating.

---

## 5. CHECKPOINT report (print after every commit, then STOP)

1. `git branch --show-current` (must be `M2_Anoj`) and `git log --oneline -3`.
2. `git show --stat HEAD` output.
3. Files created/changed, and confirmation that nothing outside section 2 changed and no secret/`.env` is staged.
4. Every assumption you made and every `TODO(ask Anoj)`.
5. **"How to verify this commit"** with the exact commands from section 6 and the expected result.
6. Commands you ran and their real results. Never claim something was tested if you did not run it; say "not run" and why.
7. The words: `Waiting for Anoj's approval before the next commit.`

If Anoj finds a problem, fix it by making **one additional commit only if asked** (otherwise amend only when told to). Do not continue to the next checkpoint until Anoj says `approved`.

---

## 6. How Anoj verifies each commit (the agent must put these in every CHECKPOINT)

**General (after every commit), run from the repo root:**
```bash
git status --short            # must print nothing (clean)
git show --stat HEAD          # only files from this commit's scope
git diff HEAD~1 --name-only | grep -E "env|secret|password" && echo "STOP: sensitive filename" || echo "ok"
```

**C1 (docs):**
- Open the three files and check: every field/action has a source tag; nothing from `features/admin/` or admin endpoints appears; the 10 operations in the table are the only ones.
- Quick traceability scan: `grep -n "TODO" docs/page-contracts/m2-owner-identity.md docs/api-contracts/openapi-owner.yaml docs/m2-db-notes.md` and answer each TODO with the agent or teammates.
- Validate the OpenAPI file by pasting it into https://editor.swagger.io (no secrets inside).

**C2 (backend):**
```bash
cd backend
./mvnw -q compile                         # must succeed
./mvnw -q test                            # smoke test passes (or skips cleanly without DB)
```
Run the app yourself with your helper script (it loads `.env` safely, disables Flyway and schema generation, and never uses `source`): `node ~/run-backend.js` from `backend/`. RabbitMQ is needed: `docker compose -f ../infra/docker-compose.yml up -d`. Then in a second terminal:
```bash
curl -s http://localhost:8080/api/owner/health          # {"status":"ok","slice":"owner"}
curl -s -i http://localhost:8080/api/owner/listings     # 501 or 401, never 500
```
Log must show a successful datasource start (`HikariPool-1 - Start completed`). Stop with Ctrl+C.

**C3 (frontend):**
```bash
cd frontend
npx ng serve                 # open http://localhost:4200
```
Click through: the owner routes render, the nav looks like the rest of the app, each page shows its loading/empty/error/success states, tenant/owner/admin mock users land on the correct page, and nothing else in the app changed (open a discovery page and the admin page to confirm). Then:
```bash
npx ng test --watch=false --browsers=ChromeHeadless
```
`npx ng build` currently fails on a route in Naviru's files (`listings/:id` prerender); that is a known, unrelated error. It is OK only if it is still exactly that one error.

---

## 7. Git rules
- Work only on branch **`M2_Anoj`**. Run `git branch --show-current` at the start of every task and STOP if it is not `M2_Anoj`. Do not create, switch or delete branches.
- Exactly three commits (C1, C2, C3) with the messages above. No other commits unless Anoj asks.
- Never `git add -A` or `git add .`. Add files by explicit path. Never commit `node_modules/`, `target/`, `.angular/`, `dist/`, `coverage/`, `.env`, backups, `package-lock.json` changes, or `angular.json` changes made by tooling.
- Do not push. Anoj pushes after approval.

## 8. Questions to ask Anoj when reached (do not guess)
- Paths of `Haystax_Supabase_Initial_Migration.sql` and `~/haystax-live-schema.txt`.
- How Spring verifies the Supabase JWT (shared secret vs JWKS); claims from token vs `profiles` lookup.
- How a user becomes an owner (self-service `is_owner` update vs approved workflow).
- Which Supabase client library the Angular app uses for register/login.
- Where tenant users land after login (route from Naviru's discovery pages).
- Who owns the Flyway migrations (V3 engagement exists) and whether Flyway stays enabled against Supabase.
- Whether photos in Weeks 1–3 use Supabase Storage (`listing-photos` bucket) or local files.
