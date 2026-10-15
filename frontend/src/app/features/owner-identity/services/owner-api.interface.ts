import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Amenity, ListingRuleWrite, ListingWrite, OwnerListing, PhotoUploadEvent, UiState,
} from '../models/owner-listing.model';
import { OwnerProfile, OwnerUser, ProfileUpdate, SignUpResult } from '../models/owner-user.model';

/**
 * Week-3 pending-requests note (MOWN-07): tenancy requests come from Member 3's engagement
 * API; we only surface a placeholder in the dashboard. Nothing here calls engagement. [AGENTS §1]
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
 * Contract the owner-identity pages depend on. Provided by MockAuthService (useMock=true)
 * or OwnerApiService (real API). Pages depend only on this interface — the provider swap
 * happens in the routes file. [AGENTS C3]
 */
export interface OwnerApi {
  /** Switchable UI state for mock mode (and pre-C2 skeletons). [AGENTS C3] */
  readonly uiState: Signal<UiState>;
  setUiState(state: UiState): void;

  // Identity — roles come from the server, never from the client. [AGENTS §0 rule 5]
  getCurrentUser(): OwnerUser | undefined;
  getMockUsers(): OwnerUser[];
  switchUser(userId: string): void;      // mock-mode only; real API: no-op
  /** Mock-mode only: the fixture user currently "signed in"; undefined in real mode. [D-MOCK] */
  getMockSessionUser(): OwnerUser | undefined;

  // Real API surface (1:1 with openapi-owner.yaml). Mock implements the same shape.
  getMe(): Promise<OwnerUser>;
  getProfile(): Promise<OwnerProfile>;
  updateProfile(body: ProfileUpdate): Promise<OwnerProfile>;
  becomeOwner(): Promise<OwnerUser>;
  listListings(): Promise<OwnerListing[]>;
  getListing(id: string): Promise<OwnerListing>;
  createListing(body: ListingWrite): Promise<OwnerListing>;
  updateListing(id: string, body: ListingWrite): Promise<OwnerListing>;
  publishListing(id: string): Promise<OwnerListing>;
  uploadPhoto(listingId: string, file: File, meta: { is_primary?: boolean; alt_text?: string; sort_order?: number }): Observable<PhotoUploadEvent>;
  deletePhoto(listingId: string, photoId: string): Promise<void>;
  getPhotoBlob(listingId: string, photoId: string): Promise<Blob>;
  listAmenities(): Promise<Amenity[]>;

  // Mock-only helpers (fixtures).
  signInMock(email: string): Promise<OwnerUser | undefined>;
  signUpMock(dto: { display_name: string; email: string; password: string; phone_number?: string }): Promise<OwnerUser>;
  getPendingRequests(): PendingRequest[];  // placeholder list, read-only
}

export const OWNER_API = new InjectionToken<OwnerApi>('haystax.owner-api');
