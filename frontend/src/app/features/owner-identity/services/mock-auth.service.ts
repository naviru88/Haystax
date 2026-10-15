import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { OwnerApi, PendingRequest } from './owner-api.interface';
import {
  Amenity, ListingWrite, ListingPhoto, OwnerListing, PhotoUploadEvent, UiState,
} from '../models/owner-listing.model';
import { OwnerProfile, OwnerUser, ProfileUpdate } from '../models/owner-user.model';

import usersJson from '../mocks/users.json';
import listingsJson from '../mocks/listings.json';
import amenitiesJson from '../mocks/amenities.json';
import pendingRequestsJson from '../mocks/pending-requests.json';

/**
 * Mock provider behind OwnerApi (environment.useMockApi = true). Reads fixtures only —
 * nothing writes to the live DB, no network. Same shape as the real OwnerApiService, so the
 * pages are identical either way. [AGENTS C3][AGENTS-W3 D-MOCK]
 */
@Injectable({ providedIn: 'root' })
export class MockAuthService implements OwnerApi {
  private readonly users = usersJson as OwnerUser[];
  private readonly listings = listingsJson as OwnerListing[];
  private readonly amenities = amenitiesJson as Amenity[];
  private readonly pending = pendingRequestsJson as PendingRequest[];

  // Default to the mock owner so the dashboard renders owner content by default.
  private readonly _currentUser = signal<OwnerUser | undefined>(
    this.users.find(u => u.is_owner) ?? this.users[0],
  );
  private readonly _uiState = signal<UiState>('success');
  private readonly _mockSessionUser = signal<OwnerUser | undefined>(undefined);

  readonly uiState = this._uiState.asReadonly();

  setUiState(state: UiState): void {
    this._uiState.set(state);
  }

  // ---------- Identity ----------
  getCurrentUser(): OwnerUser | undefined {
    return this._currentUser();
  }

  getMockUsers(): OwnerUser[] {
    return this.users;
  }

  switchUser(userId: string): void {
    if (!userId) {
      // Mock-mode "sign out": clear the session user. [D-MOCK]
      this._mockSessionUser.set(undefined);
      return;
    }
    const next = this.users.find(u => u.id === userId);
    if (next) this._currentUser.set(next);
  }

  getMockSessionUser(): OwnerUser | undefined {
    return this._mockSessionUser();
  }

  signInMock(email: string): Promise<OwnerUser | undefined> {
    const user = this.users.find(u => u.email === email);
    if (user) {
      this._currentUser.set(user);
      this._mockSessionUser.set(user);
    }
    return Promise.resolve(user);
  }

  async signUpMock(dto: {
    display_name: string;
    email: string;
    password: string;
    phone_number?: string;
  }): Promise<OwnerUser> {
    const existing = this.users.find(u => u.email === dto.email);
    if (existing) throw new Error('This email is already registered');
    const user: OwnerUser = {
      id: 'mock-user-' + Math.random().toString(36).slice(2),
      display_name: dto.display_name,
      email: dto.email,
      phone_number: dto.phone_number,
      is_owner: false,      // registration never sets roles [AGENTS §0 rule 5]
      is_admin: false,
      is_suspended: false,
    };
    this.users.push(user);
    this._currentUser.set(user);
    this._mockSessionUser.set(user);
    return user;
  }

  async getMe(): Promise<OwnerUser> {
    const u = this._currentUser();
    if (!u) throw new Error('Not signed in');
    return this.clone(u);
  }

  async getProfile(): Promise<OwnerProfile> {
    const u = await this.getMe();
    const { id, display_name, phone_number, avatar_path, is_owner, is_admin, is_suspended } = u;
    return { id, display_name, phone_number, avatar_path, is_owner, is_admin, is_suspended, last_seen_at: u.last_seen_at };
  }

  async updateProfile(body: ProfileUpdate): Promise<OwnerProfile> {
    const u = this._currentUser();
    if (!u) throw new Error('Not signed in');
    if (body.display_name !== undefined) u.display_name = body.display_name;
    if (body.phone_number !== undefined) u.phone_number = body.phone_number;
    if (body.avatar_path !== undefined) u.avatar_path = body.avatar_path;
    return this.getProfile();
  }

  async becomeOwner(): Promise<OwnerUser> {
    const u = this._currentUser();
    if (!u) throw new Error('Not signed in');
    u.is_owner = true;
    return this.clone(u);
  }

  // ---------- Listings ----------
  async listListings(): Promise<OwnerListing[]> {
    const user = this._currentUser();
    return user ? this.listings.filter(l => l.owner_id === user.id).map(l => this.cloneListing(l)) : [];
  }

  async getListing(id: string): Promise<OwnerListing> {
    const l = this.listings.find(x => x.id === id);
    if (!l) throw new Error('Listing not found');
    // Ownership: mock enforces the same rule as the API (own listings only).
    const user = this._currentUser();
    if (user && l.owner_id !== user.id) throw new Error('You do not have permission to view this listing');
    return this.cloneListing(l);
  }

  async createListing(body: ListingWrite): Promise<OwnerListing> {
    const user = this._currentUser();
    if (!user) throw new Error('Not signed in');
    const now = new Date().toISOString();
    const listing: OwnerListing = {
      id: 'mock-' + Math.random().toString(36).slice(2),
      owner_id: user.id,
      title: body.title,
      description: body.description,
      address_line_1: body.address_line_1,
      address_line_2: body.address_line_2,
      city: body.city,
      district: body.district,
      location_label: body.location_label,
      location: body.location ?? null,
      price_amount: body.price_amount,
      currency_code: body.currency_code,
      gender_policy: body.gender_policy,
      total_slots: body.total_slots,
      available_slots: body.available_slots,
      status: 'draft',
      created_at: now,
      updated_at: now,
      photos: [],
      amenities: [],
      rules: [],
    };
    this.listings.push(listing);
    return this.cloneListing(listing);
  }

  async updateListing(id: string, body: ListingWrite): Promise<OwnerListing> {
    const l = this.listings.find(x => x.id === id);
    if (!l) throw new Error('Listing not found');
    l.title = body.title;
    l.description = body.description;
    l.address_line_1 = body.address_line_1;
    l.address_line_2 = body.address_line_2;
    l.city = body.city;
    l.district = body.district;
    l.location_label = body.location_label;
    l.location = body.location ?? null;
    l.price_amount = body.price_amount;
    l.currency_code = body.currency_code;
    l.gender_policy = body.gender_policy;
    l.total_slots = body.total_slots;
    l.available_slots = body.available_slots;
    l.updated_at = new Date().toISOString();
    return this.cloneListing(l);
  }

  async publishListing(id: string): Promise<OwnerListing> {
    const l = this.listings.find(x => x.id === id);
    if (!l) throw new Error('Listing not found');
    if (l.status !== 'draft' && l.status !== 'paused') {
      throw new Error('Only draft or paused listings can be submitted for publication');
    }
    l.status = 'pending_review';
    l.updated_at = new Date().toISOString();
    return this.cloneListing(l);
  }

  // ---------- Photos (mock: no object URLs, keep storage_path) ----------
  uploadPhoto(_listingId: string, file: File, meta: { is_primary?: boolean; alt_text?: string; sort_order?: number }): Observable<PhotoUploadEvent> {
    const photo: ListingPhoto = {
      id: 'mock-photo-' + Math.random().toString(36).slice(2),
      listing_id: _listingId,
      storage_path: `mock://${file.name}`,
      alt_text: meta.alt_text,
      sort_order: meta.sort_order ?? 0,
      is_primary: meta.is_primary ?? false,
      is_approved: false,
      created_at: new Date().toISOString(),
    };
    return of({ kind: 'done', photo });
  }

  async deletePhoto(_listingId: string, photoId: string): Promise<void> {
    const i = this.listings.findIndex(l => l.photos.some(p => p.id === photoId));
    if (i >= 0) {
      this.listings[i].photos = this.listings[i].photos.filter(p => p.id !== photoId);
    }
  }

  async getPhotoBlob(listingId: string, photoId: string): Promise<Blob> {
    const l = this.listings.find(x => x.id === listingId);
    if (!l) throw new Error('Listing not found');
    const p = l.photos.find(x => x.id === photoId);
    if (!p) throw new Error('Photo not found');
    // No real bytes in mock mode — pages must handle a failed blob gracefully (placeholder).
    throw new Error('Mock has no photo bytes');
  }

  async listAmenities(): Promise<Amenity[]> {
    return [...this.amenities].sort((a, b) => a.sort_order - b.sort_order).map(a => ({ ...a }));
  }

  getPendingRequests(): PendingRequest[] {
    return [...this.pending].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  /** MOWN-03 skeleton: flips a draft/paused listing to pending_review in the mock. */
  submitForPublication(id: string): void {
    void this.publishListing(id);
  }

  private clone<T>(o: T): T {
    return o === undefined ? o : JSON.parse(JSON.stringify(o));
  }

  private cloneListing(l: OwnerListing): OwnerListing {
    return this.clone(l);
  }
}
