import { Injectable, signal } from '@angular/core';
import { OwnerApi, PendingRequest } from './owner-api.interface';
import { Amenity, OwnerListing, UiState } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';

/**
 * Week-4 real API provider behind OwnerApi. Every method maps 1:1 to the C1 OpenAPI
 * operations (openapi-owner.yaml, all `/api/owner/...`). The C2 backend endpoints are
 * 501 stubs in Week 1, so this class is NOT wired yet — swap it in when Week 4 lands.
 * [AGENTS C3: same interface as MockAuthService]
 */
@Injectable()
export class OwnerApiService implements OwnerApi {
  private readonly _uiState = signal<UiState>('loading');
  readonly uiState = this._uiState.asReadonly();

  setUiState(state: UiState): void {
    this._uiState.set(state);
  }

  /** TODO(week 4): GET /api/owner/auth/me with the Supabase JWT. */
  getCurrentUser(): OwnerUser | undefined {
    return undefined;
  }

  /** Week 1 only — no role switching against the real API. */
  switchUser(_userId: string): void {
    // no-op: roles come from the server, never from the client. [AGENTS §0 rule 5]
  }

  /** Week 1 only — mock users are fixtures, not API data. */
  getMockUsers(): OwnerUser[] {
    return [];
  }

  /** TODO(week 4): GET /api/owner/listings (owner's own only). */
  getMyListings(): OwnerListing[] {
    return [];
  }

  /** TODO(week 4): GET /api/owner/listings/{id}. */
  getListingById(_id: string): OwnerListing | undefined {
    return undefined;
  }

  /** TODO(week 4): GET /api/owner/amenities. */
  getAmenities(): Amenity[] {
    return [];
  }

  /** TODO(week 4): Member 3's tenancy endpoint (cross-slice, read-only). [MOWN-07] */
  getPendingRequests(): PendingRequest[] {
    return [];
  }

  /** TODO(week 4): POST /api/owner/listings/{id}/publish. */
  submitForPublication(_id: string): void {
    // no-op in Week 1 skeleton.
  }
}
