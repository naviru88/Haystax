import { InjectionToken, Signal } from '@angular/core';
import { Amenity, OwnerListing, UiState } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';

/**
 * Week-4 request from Owner-identity -> Spring owner slice.
 * Cross-slice note (MOWN-07): tenancy requests come from Member 3's engagement API;
 * we only surface them read-only in the Week-1 skeleton. [AGENTS §1 rule between members]
 */
export interface PendingRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  tenantDisplayName: string;
  requestedAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

/**
 * Single contract the owner-identity pages depend on.
 * Week 1: provided by MockAuthService (fixtures). Week 4: swapped for the real OwnerApiService
 * without touching the pages. [AGENTS C3: mock + api behind the same interface]
 */
export interface OwnerApi {
  /** Switchable UI state (loading/empty/error/success) for the Week-1 skeleton. [AGENTS C3] */
  readonly uiState: Signal<UiState>;
  setUiState(state: UiState): void;

  /** Identity — server-decided roles, never client-declared. [AGENTS §0 rule 5] */
  getCurrentUser(): OwnerUser | undefined;
  switchUser(userId: string): void;
  getMockUsers(): OwnerUser[];

  /** Listings (owner's own only). [MOWN-01] */
  getMyListings(): OwnerListing[];
  getListingById(id: string): OwnerListing | undefined;
  getAmenities(): Amenity[];
  getPendingRequests(): PendingRequest[];

  /** Submit for publication — stub in Week 1. [MOWN-03] */
  submitForPublication(id: string): void;
}

export const OWNER_API = new InjectionToken<OwnerApi>('haystax.owner-api');
