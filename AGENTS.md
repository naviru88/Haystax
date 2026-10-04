# AGENTS.md — Haystax, Member 2 (Owner & Identity), WEEK 1 ONLY

You are an AI coding agent working for **Anoj (Member 2)** on the Haystax monorepo.
Read this whole file before doing anything. It is the source of truth for Week 1.

---

## 0. Hard rules (never break)

1. **Do not invent.** Do not add endpoints, fields, tables, enums, libraries, or pages that are not listed in this file. If something is missing or ambiguous, write `TODO(ask Anoj): <question>` in the file and STOP that item. Do not guess.
2. **Work on one task at a time** (T1, T2, ...). Finish it, run its checks, commit, then stop and report. Do not start the next task unless told.
3. **Edit only your own paths** (section 2). Never edit another member's folders. Shared folders (`core/`, `shared/`, `common/`) need Anoj's explicit OK per file.
4. **Never push to `develop` or `main`.** Work only on the branch Anoj created for the task. No force-push. No rebasing without being asked.
5. **Never trust the client for roles or ownership.** `is_owner`, `is_admin`, and `owner_id` always come from the server/DB/JWT, never from request bodies.
6. **Do not guess versions.** Run `node -v`, `npm -v`, `ng version`, `java -version`, `mvn -v` and report the output before scaffolding. Use what is installed; ask if a version is unsuitable.
7. **Dev-only secrets.** No real passwords/keys in the repo. Use `.env.example` with placeholders; real `.env` is git-ignored.
8. **Week 1 = contracts, design, setup, seed, minimal skeleton.** Do NOT implement full CRUD, photo upload logic, or full page UIs (that is Weeks 2–3).
9. After every task, report: files created/changed, commands run + their output summary, anything skipped, open questions.

---

## 1. Project context (extracted facts — use these, not memory)

**Haystax** = boarding (rental room) marketplace. Angular SPA + Spring Boot API + Supabase PostgreSQL (PostGIS). Monorepo: `frontend/`, `backend/`, `notification-service/`, `infra/`, `docs/`.

**Team slices (vertical):**
- Member 1 (Naviru): Public Discovery — Home, Search Results, Listing Details, Recommendations.
- **Member 2 (Anoj, YOU work for him): Owner & Identity — Owner Dashboard, Listing Editor, Login/Register (unified), Admin Panel.**
- Member 3 (Binuwara): Engagement — Booking/Inquiry, Messaging/Notifications, Reviews & Ratings, Analytics.

**Rule between members:** communication only via versioned REST endpoints or events. No importing another member's source, no reading another member's tables. Weeks 1–3 use mocks/fixtures for anything cross-member.

**Roles (one account model, no separate tenant/owner accounts):**
- Tenant: normal user, `is_owner=false`, `is_admin=false`. (No `is_tenant` flag exists.)
- Owner: `is_owner=true`, `is_admin=false`. A dual-role user is also just `is_owner=true`; ownership is checked **per listing**, never globally.
- Admin: `is_admin=true`. Cannot self-register; seeded/invited only. A signup form must never be able to produce an admin.
- JWT carries capability claims `is_owner` and `is_admin`. Backend is the source of truth; UI hiding is not security.

**Week 1 deliverables (from the WBS, Member 2):**
1. Define the 4 page contracts and role rules.
2. Design the 4 owned table groups.
3. Set up Spring Boot REST + Spring Security/JPA connected to PostgreSQL (Supabase, or local Postgres for dev).
4. Seed student(tenant), owner, and admin fixtures plus local image fixtures.
5. (Header also says "Angular design, setup & seed") Minimal Angular skeleton for the owned feature folder with local mock auth/role fixtures. Keep this small.

Later (do NOT build now): Week 2 listing CRUD, photo upload, login/register, JWT claims, owner profile, moderation endpoints + tests. Week 3 build all 4 Angular pages against real local API. Week 4 merge with other members.

---

## 2. Paths you may edit

| Path | Rule |
|---|---|
| `frontend/src/app/features/owner-identity/**` | Yours |
| `backend/src/main/java/com/haystax/owner/**` | Yours |
| `backend/src/test/java/com/haystax/owner/**` | Yours |
| `docs/page-contracts/m2-owner-identity.md` | Yours |
| `docs/api-contracts/openapi-owner.yaml` | Yours |
| `backend/src/main/resources/db/migration/` (files named for owner/identity tables only) | Yours |
| `frontend/src/app/core/**`, `frontend/src/app/shared/**`, `backend/.../common/**`, `infra/**` | **Shared — ask first** |
| `features/discovery/**`, `features/engagement/**`, `.../discovery/**`, `.../engagement/**`, `notification-service/**` | **FORBIDDEN** |

Naming: files kebab-case; classes PascalCase; backend DTOs `*Dto`; DB tables snake_case plural; API routes `/api/<slice>/<resource>` (yours: `/api/owner/...`); events `domain.action`.

---

## 3. Data facts for the tables you own

Use PostgreSQL. UUID PKs (`gen_random_uuid()`), `timestamptz`, `created_at`/`updated_at` on mutable tables.

### Enums
- `listing_status`: `draft`, `pending_review`, `published`, `paused`, `removed`
- `gender_policy`: `any`, `female_only`, `male_only`

### 3.1 Identity / roles (WBS group "UsersRoles")
Columns for the profile record:
`id uuid PK`, `display_name text NOT NULL (2–120 chars)`, `phone_number text NULL`, `avatar_path text NULL`, `is_owner boolean NOT NULL default false`, `is_admin boolean NOT NULL default false`, `is_suspended boolean NOT NULL default false`, `suspension_reason text NULL (admin-only visibility)`, `created_at`, `updated_at`, `last_seen_at NULL`.
Rules: normal users can never set `is_admin`, `is_suspended`, `suspension_reason`. A DB trigger or server logic must block it.

> **OPEN DECISION D1 (auth source) — ask Anoj before writing the identity migration.**
> The database spec says identity lives in Supabase `auth.users` with `profiles.id` FK to it (no own password table). The WBS and test plan say Spring Boot issues/refreshes JWTs and hashes passwords (`UsersRoles`). These conflict.
> - Option A: Supabase Auth issues JWT; Spring validates it; `profiles` links to `auth.users`.
> - Option B: Spring owns a `users_roles` table with `password_hash` (BCrypt) and issues its own JWT; works with plain local Postgres.
> Until Anoj answers, do **not** create the identity table migration. Do T1 and T2 with the decision left as a clearly marked section.

### 3.2 Owner profile (WBS group "OwnerProfiles")
**No exact column list exists in the spec.** Do not invent one. Write `TODO(ask Anoj)` and propose a minimal list in the contract doc for him to approve (suggestion only, marked "PROPOSED").

### 3.3 `boarding_listings` (WBS group "Listings")
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid NOT NULL | FK to profile; must be an `is_owner=true` user; set by server only |
| title | text NOT NULL | 5–160 chars |
| description | text NOT NULL | required before publication |
| address_line_1 | text NOT NULL | |
| address_line_2 | text NULL | |
| city | text NOT NULL | indexed |
| district | text NULL | |
| location_label | text NULL | |
| location | geography(Point,4326) NOT NULL | PostGIS; GIST index |
| price_amount | numeric(12,2) NOT NULL | >= 0 |
| currency_code | char(3) NOT NULL default 'LKR' | |
| gender_policy | gender_policy NOT NULL default 'any' | **optional for owner to choose** |
| total_slots | int NOT NULL | > 0 |
| available_slots | int NOT NULL | 0..total_slots |
| status | listing_status NOT NULL default 'draft' | |
| moderation_note | text NULL | owner-visible |
| published_at, removed_at | timestamptz NULL | |
| created_at, updated_at | timestamptz | |

Business answer from the team: **gender preference is optional; all other listing fields are mandatory** (price, amenities, capacity, photos, address, location coordinates).
Only `published` listings are publicly visible. `available_slots = 0` is still readable but shown unavailable. Clients can never set `owner_id`. One owner can have many listings.

### 3.4 `listing_photos`
`id uuid PK`, `listing_id uuid FK NOT NULL`, `storage_path text NOT NULL` (pattern `{listing_id}/{photo_uuid}.{ext}`), `alt_text NULL`, `sort_order int default 0`, `is_primary boolean default false` (max one primary per listing), `is_approved boolean`, `created_at`, `updated_at`. DB stores the object path, never a permanent public URL.

### 3.5 Related reference tables (listing-adjacent; create only if Anoj confirms they are in your group)
`amenities(id, code unique, name, description, is_active default true, sort_order default 0, created_at, updated_at)`; `listing_amenities(listing_id, amenity_id, created_at)` PK `(listing_id, amenity_id)`; `listing_rules(id, listing_id, rule_code, label, is_allowed, notes, created_at, updated_at)`.
Seed amenity codes: `wifi, parking, furnished, air_conditioning, common_kitchen, laundry, water_included, electricity_included, attached_bathroom, security`.

### 3.6 Indexes to include with your tables
`profile(is_owner)`, `profile(is_admin)`, `profile(is_suspended)`, `boarding_listings(owner_id)`, `(status)`, `(city)`, `(gender_policy)`, `(price_amount)`, `(available_slots)`, GIST on `location`, `listing_photos(listing_id, sort_order)`, `listing_amenities(amenity_id)`.

### 3.7 Moderation rules (Admin Panel must reflect these; enforcement logic is Week 2+, reports belong to Member 3)
Based on count of **valid reports** per listing relative to `total_slots` (max capacity):
- reaches 50% of capacity → owner gets a warning message
- equals capacity → listing flagged **"Under review"**, visible to anyone viewing the listing
- reaches 2× capacity → listing removed
- owner with 3 removed listings → owner account suspended
Admin accounts are seeded/invited only. Every admin action must be auditable (actor, action, target, reason, timestamp).

---

## 4. Tasks (do in order, one per branch)

### T0 — Environment check (no code)
- Run and report: `git --version`, `node -v`, `npm -v`, `ng version`, `java -version`, `mvn -v`, `docker --version`.
- List the repo tree (2 levels). Report which of `frontend/`, `backend/`, `docs/`, `infra/` already exist and what teammates have already committed to `develop`.
- Done when: report delivered. No file changes.

### T1 — Page contracts + role rules
File: `docs/page-contracts/m2-owner-identity.md`
For **each** of the 4 pages (Login/Register, Owner Dashboard, Listing Editor, Admin Panel) document:
1. Route path and who may access (anonymous / tenant / owner / admin) and redirect when denied.
2. What the page shows and what actions it has (only those implied by the user stories below).
3. Data it needs (field names must match section 3).
4. API calls it will make (reference endpoint names from T2).
5. UI states: loading, empty, error, success (and page-specific ones: upload progress/error, moderation state, authorization error).
6. Mock/fixture data it uses in Weeks 1–3.
7. Acceptance checklist (testable bullets).

Also add a **Role rules** section: a table of role × page/action → allow/deny; guards `authGuard`, `ownerGuard` (needs `is_owner=true`), `adminGuard` (needs `is_admin=true`); post-login redirect (admin → Admin Panel, owner → Owner Dashboard, tenant → public home, which is Member 1's page, so only reference its route as `TODO(ask Anoj)`).

Source stories to cover (use only these): ADM-01..ADM-05; OWN-01..OWN-05, OWN-07 (confirm tenant belongs to Member 3's booking flow — mark as cross-slice, not yours), OWN-08; MOWN-01, MOWN-03, MOWN-04, MOWN-07; DUAL-01..DUAL-03.
Key acceptance points to carry in: owner sees only own listings; edit screen shows listing identity and location; stale/invalid ID gives a safe error and never updates another listing; non-admin gets an authorization error (no partial data); self-registered users can't become admin; photo type/size validation feedback; vacancy never negative or above capacity.
- Done when: all 4 pages complete, no invented fields, open questions listed at the bottom.

### T2 — API contract (OpenAPI)
File: `docs/api-contracts/openapi-owner.yaml` (OpenAPI 3.x). Design only, no implementation. Propose exactly these operations (rename only if Anoj approves):

| Operation | Method + path | Access |
|---|---|---|
| Register | POST `/api/owner/auth/register` | anonymous; body must NOT accept `is_admin`/`is_owner=admin` tricks |
| Login | POST `/api/owner/auth/login` | anonymous; returns JWT with `is_owner`, `is_admin` claims |
| Refresh | POST `/api/owner/auth/refresh` | valid refresh token |
| Current user | GET `/api/owner/auth/me` | authenticated |
| Owner profile get/update | GET, PUT `/api/owner/profile` | owner |
| List my listings | GET `/api/owner/listings` | owner (own only) |
| Create listing | POST `/api/owner/listings` | owner; `owner_id` from token |
| Get/Update my listing | GET, PUT `/api/owner/listings/{id}` | owning owner (or admin) |
| Submit/publish listing | POST `/api/owner/listings/{id}/publish` | owning owner |
| Upload photo | POST `/api/owner/listings/{id}/photos` | owning owner; multipart; validate MIME/size |
| Delete photo | DELETE `/api/owner/listings/{id}/photos/{photoId}` | owning owner |
| Admin list listings | GET `/api/owner/admin/listings` | admin only |
| Admin moderate listing | POST `/api/owner/admin/listings/{id}/moderation` | admin only; reason required |

For each: request schema, response schema, status codes (200/201/400/401/403/404/409/422), and the shared error shape. Define the JWT claim set (`sub`, `is_owner`, `is_admin`, `exp`). Mark anything uncertain `x-todo`. Do not add operations beyond this table.
Also define the one event Member 2 *may* emit later as `listing.published`/`listing.removed` (names only, payload `TODO`).
- Done when: file validates (run an OpenAPI linter if installable; otherwise report that you could not validate).

### T3 — Database design + migrations
- Resolve D1 first (ask Anoj). Then create migration SQL files under `backend/src/main/resources/db/migration/` named `V<n>__<description>.sql` in this order: extensions (pgcrypto, postgis) → enums → identity/profile table → owner profile (only after approval) → amenities (if confirmed) → boarding_listings → listing_photos → listing_amenities/rules (if confirmed) → indexes.
- Include CHECK constraints from section 3 (price >= 0, total_slots > 0, available_slots between 0 and total_slots, rating-free). Partial unique index: one `is_primary=true` photo per listing.
- Add a short `docs/` or comment note of the table relationships (text/mermaid ER) for your tables only.
- Verify: run migrations against a clean local Postgres+PostGIS (e.g. via Docker) and report the result. If Docker is unavailable, say so; do not claim it was tested.

### T4 — Spring Boot setup (owner slice)
- The scaffold already exists (root package `com.haystax`). Add code only inside `backend/src/main/java/com/haystax/owner/**` and tests in `backend/src/test/java/com/haystax/owner/**`. Do not edit `pom.xml`, `application*.yml`, `HaystaxApplication`, or `config/` without asking Anoj first; if a dependency is missing, list it and ask. Check `pom.xml` for what is already declared (Security, JPA, Flyway, JWT, Testcontainers) before proposing anything.
- Dependencies allowed: Spring Web, Spring Security, Spring Data JPA, Validation, PostgreSQL driver, Flyway, springdoc-openapi, a JWT library (name it and ask Anoj to approve), test deps: Spring Boot Test, Testcontainers (PostgreSQL). Nothing else.
- Create the package skeleton from the folder spec: `owner/{controller,service,repository,dto,mapper}` and empty classes/stubs named as in the spec (`AuthController`, `ListingWriteController`, `OwnerProfileController`, `AdminController`, `AuthService`, `ListingWriteService`, `PhotoUploadService`, `ModerationService`, `ProfileRepository`, `ListingWriteRepository`, `ListingPhotoRepository`). Stubs only, no business logic.
- `application.yml` + `application-dev.yml` reading DB URL/user/password from env vars (`HAYSTAX_DB_URL`, etc.). Provide `.env.example`.
- Add one health endpoint and one smoke test proving the app boots and connects to the DB.
- Done when: `./mvnw verify` (or `mvn verify`) output is reported honestly.

### T5 — Seed fixtures
- Three users: one **tenant-only**, one **owner-only**, one **admin** (optionally also a dual-role user). Dev-only credentials documented in `docs/` marked "DEV ONLY, never production". Passwords must be stored hashed.
- 3–5 sample listings owned by the owner user, covering every `gender_policy`, different prices, one with `available_slots = 0`, statuses mixed (`draft`, `published`, `pending_review`).
- Local image fixtures: a few small placeholder images in the repo (small files, license-safe or generated), plus matching `listing_photos` rows.
- Seed runs only under the `dev` profile. A `reset`/reseed script is welcome but must be idempotent.
- Done when: seeding on a clean DB succeeds and row counts are reported.

### T6 — Angular skeleton for `owner-identity` (smallest possible; skip if time is short)
- Confirm Angular app exists in `frontend/` on `develop`; if not, ask before running `ng new` (shared).
- Inside `features/owner-identity/` create only: folders `owner-dashboard/`, `listing-editor/`, `auth/`, `admin-panel/`, `services/`, `mocks/`, plus `owner-identity-routing.module.ts`.
- Each page = a minimal placeholder component showing its title and its UI states driven by a mock flag. No styling polish.
- `services/mock-auth.service.ts` + `auth-api.service.ts` behind the **same TypeScript interface** (so Week 4 swaps the mock, components never change).
- `mocks/users.json`, `mocks/listings.json`, `mocks/roles.json` matching section 3 field names.
- Guards/interceptors/models in `core/` are shared: write them only if Anoj approves, otherwise leave `TODO`.
- Verify: `ng build` and `ng test --watch=false --browsers=ChromeHeadless` outputs reported.

---

## 5. Git workflow rules for the agent
- All work happens on Anoj's branch **`M2_Anoj`** (already created, already checked out by Anoj). Do not create, switch, or delete branches. Run `git branch --show-current` at the start of every task and STOP if it is not `M2_Anoj`.
- Make **one commit per task** (or several small commits within a task), so each task can be reviewed or reverted separately. Put the task id in the message, e.g. `docs(owner): T1 page contracts for login and dashboard`.
- **Repo state as merged from `develop` (verified from the merge output):**
  - `docs/page-contracts/m2-owner-identity.md` and `docs/api-contracts/openapi-owner.yaml` exist but are **empty (0 bytes)**. Fill them; do not create duplicates.
  - Backend scaffold exists: root package is **`com.haystax`** (`HaystaxApplication`), NOT `com.haystax.backend`. Existing slices: `engagement/`, `common/exception/`, `config/RabbitMQConfig`. There is no `owner/` package yet. Flyway files present: `V3__engagement_tables.sql`, `V3_1__seed_engagement.sql`. Tests exist in `com/haystax/` and `com/haystax/engagement/`.
  - `backend/package.json` and `backend/server.js` (Node) exist in the Java backend folder. Do not touch or depend on them; report them in T0.
  - Frontend is an Angular app with standalone components (`app.routes.ts`, `app.config.ts`, no NgModules). **Follow the existing style** (standalone components, `*.routes.ts`) instead of the `*-routing.module.ts` naming in older docs. Existing features: `admin/`, `discovery/`, `engagement/`, plus `shared/layout/app-shell`, `shared/components/*`.
  - **`frontend/src/app/features/admin/` already exists** (overview, reports, moderation, users, audit, broadcasts, with mocks and `admin-api.service.ts`). Do NOT modify or duplicate it. Ownership of the Admin Panel is an open question for Anoj to settle with teammates (see section 6).
  - Two files with a carriage return in their names exist in the repo: `frontend/canvas,\r` and `frontend/svg,\r`. They are hidden on this machine by sparse-checkout. Never touch, add, or recreate them.
  - Flyway: to avoid version collisions, **ask Anoj which version numbers to use** for your migrations. Do not reuse `V3`/`V3_1`. Also verify that engagement migrations don't already create tables you own.
- Never overwrite a teammate's content in shared files.
- Windows warning: never create files whose names contain `? * : " < > |` or trailing commas. Report any such file you see in the repo instead of touching it.
- Commit small and often. Message format: `type(scope): summary`, e.g. `docs(owner): add page contracts for login and dashboard`.
- Before finishing a task: run its checks, `git status`, `git diff --stat`, and confirm no file outside section 2 changed. Never commit `node_modules/`, `target/`, `.angular/`, `dist/`, `coverage/`, `.env`.
- Stop after committing. Anoj opens the PR into `develop`.

## 6. Questions you must ask Anoj when reached (do not guess)
- Admin Panel ownership: `features/admin/` already exists in the repo. Does Anoj extend it, replace it, or only supply the auth/role/moderation backend for it?
- Flyway version numbers for owner/identity migrations.
- D1: Supabase Auth vs Spring-owned users table.
- Owner profile columns.
- Whether `amenities`, `listing_amenities`, `listing_rules` belong to your table group.
- Who commits the shared backend/frontend scaffold first.
- Where tenant users land after login (Member 1's route).
- Photo storage in Week 1–3: local disk vs Supabase Storage (spec says Supabase Storage private bucket `listing-photos`; the architecture diagram mentions S3/R2).
- Migration tool: Flyway files (folder spec) vs Supabase-managed migrations.
