# Shared cross-module adapters

Landing zone for the **only** sanctioned way for one slice to read another slice's data
(AGENTS-W4 decision **D-ADAPTERS**). Adapters translate a peer's published wire contract into
a local, UI-shaped model. No shared tables, no shared DTOs, no direct imports of another
feature's modules.

## Current adapters

| Adapter | Direction | Peer contract | Status |
|---|---|---|---|
| `engagement-booking.adapter.ts` | M3 Booking/Engagement → Owner Dashboard | `docs/api-contracts/openapi-engagement.yaml` (`GET /api/engagement/tenancies`, `Tenancy`, `PaginatedTenancies`) | Shipped in W4-C2 |
| *(discovery)* | M1 Discovery → Owner | `docs/api-contracts/openapi-discovery.yaml` | **Not built** — see TODO below |

## Rules every adapter follows

1. **Single read path.** Only documented operations; no inventing endpoints or query params.
2. **Untrusted input.** Unknown shapes, missing fields and unknown enum values degrade to a
   safe fallback — an adapter never throws into a component.
3. **Result unions, not exceptions.** `load*()` returns `{ ok: true, ... } | { ok: false, message }`
   so the page can render a fallback state and keep working.
4. **Auth is local.** The shared `OwnerAuthInterceptor` only decorates `/api/owner/**`
   (D-TOKEN). Cross-module calls attach their own `Authorization` header.
5. **Mapping is pure and exported** (`mapTenancyToBookingSummary`, …) so it can be unit-tested
   without HTTP.

## TODO(ask Anoj) — Member 1 discovery adapter

`docs/api-contracts/openapi-discovery.yaml` is **empty (0 bytes)** in this repo, so there is no
published M1 contract to adapt. The Owner Dashboard does not need discovery data to work — its
listings come from `GET /api/owner/listings` — so W4-C2 shipped without an M1 adapter rather
than inventing endpoints. Unblock by publishing the M1 contract (at minimum the listing-summary
read operation and its DTO), then add `discovery-listing.adapter.ts` here following the rules
above.
