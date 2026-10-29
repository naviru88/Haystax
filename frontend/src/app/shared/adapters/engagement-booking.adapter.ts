import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SupabaseAuthService } from '../../features/owner-identity/services/supabase-auth.service';
import { ApiError, toApiError } from '../../features/owner-identity/services/api-error';

/**
 * D-ADAPTERS — Member 3 (Booking / Engagement) → Owner & Identity.
 *
 * The Owner Dashboard must show incoming tenancy requests without ever importing Member 3's
 * modules or reading their tables. Everything cross-module goes through this adapter:
 *
 *   M3 wire DTO (camelCase, docs/api-contracts/openapi-engagement.yaml `Tenancy`)
 *        -> local owner-facing model (`BookingSummary`, snake-free, UI-shaped)
 *
 * Isolation rules:
 *  - Only the documented read endpoint `GET /api/engagement/tenancies` is called.
 *  - The response is treated as untrusted: unknown shapes and unknown statuses degrade to a
 *    safe value instead of throwing.
 *  - Failures never bubble up: `loadBookingSummaries()` resolves with `{ ok: false }` so the
 *    dashboard can render its fallback state. [AGENTS-W4 D-ADAPTERS]
 *  - The JWT is attached here, locally. The shared OwnerAuthInterceptor deliberately only
 *    touches `/api/owner/**` (D-TOKEN); widening it would be a cross-module change.
 */

/** Member 3's `BookingStatus` enum, verbatim from openapi-engagement.yaml. */
export type EngagementBookingStatus =
  | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'ended';

/** Member 3's `Tenancy` schema (wire shape — camelCase, do not rename). */
export interface EngagementTenancyDto {
  id: string;
  listingId: string;
  tenantId: string;
  ownerId?: string;
  moveInDate: string;
  endDate?: string | null;
  status: EngagementBookingStatus;
  message?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Member 3's `PaginatedTenancies` envelope. */
export interface EngagementPageDto<T> {
  content: T[];
  page?: { number?: number; size?: number; totalElements?: number; totalPages?: number };
}

/**
 * Local owner-facing model. This is what the Owner Dashboard renders; it is deliberately
 * decoupled from the M3 wire shape so a peer contract change only touches this file.
 */
export type BookingSummaryStatus = 'pending' | 'confirmed' | 'rejected' | 'ended';

export interface BookingSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  tenantDisplayName: string;
  requestedAt: string;
  status: BookingSummaryStatus;
}

/** Lookups the owner slice can supply (its own listings / fixtures). */
export interface BookingSummaryContext {
  listingTitles?: Record<string, string>;
  tenantNames?: Record<string, string>;
}

export type BookingSummaryLoad =
  | { ok: true; requests: BookingSummary[] }
  | { ok: false; message: string };

/** M3 booking status → local display status. Unknown values degrade to 'pending'. */
export function mapBookingStatus(status: unknown): BookingSummaryStatus {
  switch (status) {
    case 'approved':
    case 'active':
      return 'confirmed';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    case 'ended':
      return 'ended';
    case 'submitted':
    default:
      return 'pending';
  }
}

function shortId(id: string): string {
  return id ? id.slice(0, 8) : '—';
}

/**
 * Map one M3 tenancy onto the local model.
 * M3's `Tenancy` carries ids only — no listing title, no tenant name. The adapter resolves
 * them from the context when the caller has them and otherwise shows a readable fallback
 * instead of guessing. TODO(ask Anoj): should M3 expose denormalised listing_title /
 * tenant_display_name on the booking summary, or should the owner slice batch-resolve them?
 */
export function mapTenancyToBookingSummary(
  dto: EngagementTenancyDto,
  ctx: BookingSummaryContext = {},
): BookingSummary {
  const listingTitle =
    ctx.listingTitles?.[dto.listingId] ?? `Listing ${shortId(dto.listingId)}`;
  const tenantDisplayName =
    ctx.tenantNames?.[dto.tenantId] ?? `Tenant ${shortId(dto.tenantId)}`;

  return {
    id: dto.id,
    listingId: dto.listingId,
    listingTitle,
    tenantDisplayName,
    requestedAt: dto.createdAt ?? dto.moveInDate ?? '',
    status: mapBookingStatus(dto.status),
  };
}

/**
 * Map a whole response. Accepts the documented `{ content: [...] }` envelope and a bare
 * array (current M3 controller behaviour differs from the newer paginated contract), and
 * drops entries that are not objects or have no id.
 */
export function mapTenanciesToBookingSummaries(
  payload: unknown,
  ctx: BookingSummaryContext = {},
): BookingSummary[] {
  const rows: unknown = Array.isArray(payload)
    ? payload
    : (payload as { content?: unknown } | null)?.content;

  if (!Array.isArray(rows)) return [];

  const mapped = rows
    .filter((r): r is EngagementTenancyDto => !!r && typeof r === 'object' && 'id' in r)
    .map(r => mapTenancyToBookingSummary(r, ctx));

  // Pending first, then newest request first.
  const rank: Record<BookingSummaryStatus, number> = {
    pending: 0, confirmed: 1, rejected: 2, ended: 3,
  };
  return mapped.sort(
    (a, b) => rank[a.status] - rank[b.status] || b.requestedAt.localeCompare(a.requestedAt),
  );
}

@Injectable({ providedIn: 'root' })
export class BookingSummaryAdapter {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(SupabaseAuthService);

  /** Fetch Member 3 booking summaries for the signed-in owner. Never throws. */
  async loadBookingSummaries(ctx: BookingSummaryContext = {}): Promise<BookingSummaryLoad> {
    try {
      const token = await this.auth.getAccessToken();
      const payload = await firstValueFrom(
        this.http.get<unknown>(`${environment.apiBaseUrl}/api/engagement/tenancies`, {
          params: { size: 50 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      );
      return { ok: true, requests: mapTenanciesToBookingSummaries(payload, ctx) };
    } catch (err) {
      return { ok: false, message: this.failureMessage(err) };
    }
  }

  private failureMessage(err: unknown): string {
    const e: ApiError = toApiError(err);
    if (e.kind === 'network') return 'Booking requests are temporarily unavailable.';
    if (e.kind === 'auth' || e.kind === 'forbidden') {
      return 'Booking requests need a signed-in session.';
    }
    return e.message || 'Booking requests are temporarily unavailable.';
  }
}
