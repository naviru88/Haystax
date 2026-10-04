import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { HttpDiscoveryApiService } from '../services/http-discovery-api.service';
import { DiscoveryView, Listing, SearchFilters } from '../models/listing.model';
import { environment } from '../../../../environments/environment';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { FilterBarComponent } from './filter-bar/filter-bar.component';
import { ListingToggleComponent } from './listing-toggle/listing-toggle.component';

type LocationState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

@Component({
  selector: 'app-discover',
  imports: [
    ListingCardComponent,
    StateViewComponent,
    FilterBarComponent,
    ListingToggleComponent,
  ],
  templateUrl: './discover.component.html',
})
export class DiscoverComponent {
  private readonly mockApi = inject(DiscoveryApiService);
  private readonly httpApi = inject(HttpDiscoveryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly pageSize = 12;
  readonly defaultRadiusKm = 15;

  readonly filters = signal<SearchFilters>({});
  readonly view = signal<DiscoveryView>('recommended');
  readonly page = signal(1);

  readonly items = signal<Listing[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  //Geolocation state
  readonly locationState = signal<LocationState>('idle');
  readonly locationError = signal<string | null>(null);

  //When set, the grid shows nearby listings instead of a paged search.
  readonly nearActive = signal(false);

  readonly result = computed(() => ({
    items: this.items(),
    total: this.total(),
  }));

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  constructor() {
    this.route.queryParams.subscribe((params) => {
      // If we're in "near" mode, keep it — don't let filter params
      // silently swap back to a normal search.
      if (this.nearActive()) return;

      this.view.set(params['view'] === 'all' ? 'all' : 'recommended');
      this.filters.set({
        city: params['city'] || undefined,
        minPrice: params['minPrice'] ? +params['minPrice'] : undefined,
        maxPrice: params['maxPrice'] ? +params['maxPrice'] : undefined,
        genderPolicy: params['genderPolicy'] || undefined,
        sort: params['sort'] || 'relevance',
      });
      this.page.set(params['page'] ? +params['page'] : 1);
    });

    effect(() => {
      // Skip auto-reload while near mode is active.
      if (this.nearActive()) return;

      const filters = this.filters();
      const view = this.view();
      const page = this.page();
      this.load(filters, view, page);
    });
  }

  // standard search

  private load(filters: SearchFilters, view: DiscoveryView, page: number): void {
    if (environment.useMockApi) {
      const result = this.mockApi.listByView(view, {
        ...filters,
        page,
        pageSize: this.pageSize,
      });
      this.items.set(result.items);
      this.total.set(result.total);
      this.loading.set(false);
      this.error.set(null);
      return;
    }

    const effectiveSort =
      filters.sort && filters.sort !== 'relevance'
        ? filters.sort
        : view === 'all'
          ? 'title_asc'
          : 'relevance';

    this.loading.set(true);
    this.error.set(null);

    this.httpApi
      .fetchSearch(view, { ...filters, sort: effectiveSort, page }, this.pageSize)
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load listings. Is the backend running?');
          this.loading.set(false);
          console.error('Discovery fetch failed', err);
        },
      });
  }

  // near me

  activateNearMe(): void {
    if (!navigator.geolocation) {
      this.locationState.set('error');
      this.locationError.set('Your browser does not support location access.');
      return;
    }

    this.locationState.set('requesting');
    this.locationError.set(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => this.onLocationSuccess(pos.coords.latitude, pos.coords.longitude),
      (err) => this.onLocationError(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  private onLocationSuccess(lat: number, lng: number): void {
    this.locationState.set('active');
    this.nearActive.set(true);

    if (environment.useMockApi) {
      const result = this.mockApi.listByView('all', {});
      this.items.set(result.items);
      this.total.set(result.total);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.httpApi
      .fetchNearby(lat, lng, this.defaultRadiusKm, this.filters())
      .subscribe({
        next: (listings) => {
          this.items.set(listings);
          this.total.set(listings.length);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load nearby listings.');
          this.loading.set(false);
          console.error('Near fetch failed', err);
        },
      });
  }

  private onLocationError(err: GeolocationPositionError): void {
    let message = 'Location access failed.';
    if (err.code === err.PERMISSION_DENIED) {
      message = 'Location permission was denied. You can search by city instead.';
      this.locationState.set('denied');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      message = 'Your location could not be determined.';
      this.locationState.set('error');
    } else if (err.code === err.TIMEOUT) {
      message = 'Location request timed out.';
      this.locationState.set('error');
    }
    this.locationError.set(message);
  }

  clearNearMe(): void {
    this.nearActive.set(false);
    this.locationState.set('idle');
    this.locationError.set(null);
    this.load(this.filters(), this.view(), this.page());
  }

  // filter/view/page handlers

  onFiltersChange(next: SearchFilters): void {
    if (this.nearActive()) {
      this.nearActive.set(false);
      this.locationState.set('idle');
    }
    this.page.set(1);
    this.applyToUrl(next, this.view(), 1);
  }

  onViewChange(next: DiscoveryView): void {
    if (this.nearActive()) {
      this.nearActive.set(false);
      this.locationState.set('idle');
    }
    this.page.set(1);
    this.applyToUrl(this.filters(), next, 1);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.applyToUrl(this.filters(), this.view(), p);
  }

  private applyToUrl(filters: SearchFilters, view: DiscoveryView, page: number): void {
    const queryParams: Record<string, unknown> = {};
    if (view === 'all') queryParams['view'] = 'all';
    if (filters.city) queryParams['city'] = filters.city;
    if (filters.minPrice != null) queryParams['minPrice'] = filters.minPrice;
    if (filters.maxPrice != null) queryParams['maxPrice'] = filters.maxPrice;
    if (filters.genderPolicy) queryParams['genderPolicy'] = filters.genderPolicy;
    if (filters.sort && filters.sort !== 'relevance') queryParams['sort'] = filters.sort;
    if (page > 1) queryParams['page'] = page;
    this.router.navigate([], { queryParams, replaceUrl: false });
  }
}
