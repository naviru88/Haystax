import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DiscoveryView,
  Listing,
  PaginatedListings,
  SearchFilters,
} from '../models/listing.model';

@Injectable({ providedIn: 'root' })
export class HttpDiscoveryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/discovery`;

  fetchSearch(
    view: DiscoveryView,
    filters: SearchFilters,
    pageSize = 12,
  ): Observable<PaginatedListings> {
    let params = new HttpParams();

    if (filters.city) params = params.set('city', filters.city);
    if (filters.minPrice != null) params = params.set('minPrice', filters.minPrice);
    if (filters.maxPrice != null) params = params.set('maxPrice', filters.maxPrice);
    if (filters.genderPolicy) params = params.set('genderPolicy', filters.genderPolicy);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.page) params = params.set('page', filters.page);
    params = params.set('pageSize', pageSize);

    return this.http
      .get<PaginatedListings>(`${this.base}/listings`, { params })
      .pipe(
        catchError((err) => {
          console.error('Discovery API error', err);
          return of({ items: [], total: 0 });
        })
      );
  }

  fetchById(id: string): Observable<Listing> {
    return this.http.get<Listing>(`${this.base}/listings/${id}`);
  }

  fetchRecommendations(limit = 12): Observable<Listing[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http
      .get<Listing[]>(`${this.base}/recommendations`, { params })
      .pipe(catchError(() => of([])));
  }

  fetchNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters: SearchFilters = {},
  ): Observable<Listing[]> {
    let params = new HttpParams()
      .set('lat', lat)
      .set('lng', lng)
      .set('radiusKm', radiusKm);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.genderPolicy) params = params.set('genderPolicy', filters.genderPolicy);
    return this.http
      .get<Listing[]>(`${this.base}/listings/near`, { params })
      .pipe(catchError(() => of([])));
  }
}
