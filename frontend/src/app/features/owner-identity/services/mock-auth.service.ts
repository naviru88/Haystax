import { Injectable, signal } from '@angular/core';
import { OwnerApi, PendingRequest } from './owner-api.interface';
import { Amenity, OwnerListing, UiState } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';

import usersJson from '../mocks/users.json';
import listingsJson from '../mocks/listings.json';
import amenitiesJson from '../mocks/amenities.json';
import pendingRequestsJson from '../mocks/pending-requests.json';

/**
 * Week-1 mock provider behind OwnerApi. Reads fixtures only — nothing writes to the live DB.
 * Week 4: swap `useClass: MockAuthService` -> `useClass: OwnerApiService` in the routes file.
 * [AGENTS C3 scope][AGENTS §0.1]
 */
@Injectable()
export class MockAuthService implements OwnerApi {
  private readonly users = usersJson as OwnerUser[];
  private readonly listings = listingsJson as OwnerListing[];
  private readonly amenities = amenitiesJson as Amenity[];
  private readonly pending = pendingRequestsJson as PendingRequest[];

  // Default to the mock owner so the dashboard renders owner content by default.
  private readonly _currentUser = signal<OwnerUser | undefined>(
    this.users.find(u => u.isOwner) ?? this.users[0]
  );

  private readonly _uiState = signal<UiState>('success');

  readonly uiState = this._uiState.asReadonly();

  setUiState(state: UiState): void {
    this._uiState.set(state);
  }

  getCurrentUser(): OwnerUser | undefined {
    return this._currentUser();
  }

  switchUser(userId: string): void {
    const next = this.users.find(u => u.id === userId);
    if (next) this._currentUser.set(next);
  }

  getMockUsers(): OwnerUser[] {
    return this.users;
  }

  getMyListings(): OwnerListing[] {
    const user = this._currentUser();
    return user ? this.listings.filter(l => l.ownerId === user.id) : [];
  }

  getListingById(id: string): OwnerListing | undefined {
    return this.listings.find(l => l.id === id);
  }

  getAmenities(): Amenity[] {
    return [...this.amenities].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getPendingRequests(): PendingRequest[] {
    return [...this.pending].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  /** MOWN-03 skeleton: flips a draft/paused listing to pending_review in the mock. */
  submitForPublication(id: string): void {
    const listing = this.listings.find(l => l.id === id);
    if (listing && (listing.status === 'draft' || listing.status === 'paused')) {
      listing.status = 'pending_review';
    }
  }
}
