import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { OWNER_API, OwnerApi } from './owner-api.interface';
import {
  Amenity, ListingWrite, OwnerListing, PhotoUploadEvent, UiState,
} from '../models/owner-listing.model';
import { OwnerProfile, OwnerUser, ProfileUpdate } from '../models/owner-user.model';
import { ApiError, toApiError } from './api-error';

/**
 * Real API provider behind OwnerApi. Every method maps 1:1 to the C1 OpenAPI operations
 * (openapi-owner.yaml, all `/api/owner/...`). Used when environment.useMockApi is false.
 * [AGENTS C3: same interface as MockAuthService]
 */

/** Resolve an HTTP observable to a promise, mapping failures through toApiError. */
function fromHttp<T>(obs: Observable<T>): Promise<T> {
  return firstValueFrom(obs).catch((e: unknown) => {
    throw toApiError(e);
  });
}

@Injectable()
export class OwnerApiService implements OwnerApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/owner`;

  private readonly _uiState = signal<UiState>('loading');
  readonly uiState = this._uiState.asReadonly();

  setUiState(state: UiState): void {
    this._uiState.set(state);
  }

  // ---------- Identity ----------
  getMe(): Promise<OwnerUser> {
    return fromHttp(this.http.get<OwnerUser>(`${this.base}/auth/me`));
  }

  getProfile(): Promise<OwnerProfile> {
    return fromHttp(this.http.get<OwnerProfile>(`${this.base}/profile`));
  }

  updateProfile(body: ProfileUpdate): Promise<OwnerProfile> {
    return fromHttp(this.http.put<OwnerProfile>(`${this.base}/profile`, body));
  }

  becomeOwner(): Promise<OwnerUser> {
    return fromHttp(this.http.post<OwnerUser>(`${this.base}/profile/become-owner`, {}));
  }

  // ---------- Listings ----------
  listListings(): Promise<OwnerListing[]> {
    return fromHttp(this.http.get<OwnerListing[]>(`${this.base}/listings`));
  }

  getListing(id: string): Promise<OwnerListing> {
    return fromHttp(this.http.get<OwnerListing>(`${this.base}/listings/${id}`));
  }

  createListing(body: ListingWrite): Promise<OwnerListing> {
    return fromHttp(this.http.post<OwnerListing>(`${this.base}/listings`, body));
  }

  updateListing(id: string, body: ListingWrite): Promise<OwnerListing> {
    return fromHttp(this.http.put<OwnerListing>(`${this.base}/listings/${id}`, body));
  }

  publishListing(id: string): Promise<OwnerListing> {
    return fromHttp(this.http.post<OwnerListing>(`${this.base}/listings/${id}/publish`, {}));
  }

  // ---------- Photos ----------
  uploadPhoto(
    listingId: string,
    file: File,
    meta: { is_primary?: boolean; alt_text?: string; sort_order?: number },
  ): Observable<PhotoUploadEvent> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (meta.is_primary !== undefined) form.append('is_primary', String(meta.is_primary));
    if (meta.alt_text !== undefined) form.append('alt_text', meta.alt_text);
    if (meta.sort_order !== undefined) form.append('sort_order', String(meta.sort_order));

    return this.http
      .post(`${this.base}/listings/${listingId}/photos`, form, { reportProgress: true, observe: 'events' })
      .pipe(
        map(event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            return { kind: 'progress' as const, percent: Math.round((100 * event.loaded) / event.total) };
          }
          if (event.type === HttpEventType.Response) {
            const photo = event.body as never;
            return { kind: 'done' as const, photo };
          }
          return { kind: 'progress' as const, percent: 0 };
        }),
      );
  }

  deletePhoto(listingId: string, photoId: string): Promise<void> {
    return fromHttp(this.http.delete<void>(`${this.base}/listings/${listingId}/photos/${photoId}`));
  }

  getPhotoBlob(listingId: string, photoId: string): Promise<Blob> {
    return fromHttp(
      this.http.get(`${this.base}/listings/${listingId}/photos/${photoId}/content`, { responseType: 'blob' }),
    );
  }

  // ---------- Amenities ----------
  listAmenities(): Promise<Amenity[]> {
    return fromHttp(this.http.get<Amenity[]>(`${this.base}/amenities`));
  }

  // ---------- Mock-only (real API has no user switching) ----------
  getCurrentUser(): OwnerUser | undefined { return undefined; }
  getMockUsers(): OwnerUser[] { return []; }
  switchUser(_userId: string): void { /* roles come from the server, never the client */ }
  getMockSessionUser(): OwnerUser | undefined { return undefined; }
  signInMock(_email: string): Promise<OwnerUser | undefined> { return Promise.resolve(undefined); }
  signUpMock(_dto: { display_name: string; email: string; password: string; phone_number?: string }): Promise<OwnerUser> {
    return Promise.reject(new Error('Mock sign-up is not available in real mode.'));
  }
  getPendingRequests(): never[] { return []; }
}

/** Helper passed to providers as a factory when real mode is on. */
export function provideOwnerApiReal() {
  return { provide: OWNER_API, useClass: OwnerApiService };
}
