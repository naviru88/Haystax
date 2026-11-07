import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { HttpDiscoveryApiService } from '../services/http-discovery-api.service';
import { DiscoveryView, Listing, SearchFilters } from '../models/listing.model';
import { environment } from '../../../../environments/environment';
import { LocationService, ResolvedLocation } from '../../../shared/services/location.service';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { FilterBarComponent } from './filter-bar/filter-bar.component';
import { ListingToggleComponent } from './listing-toggle/listing-toggle.component';
import { GoogleMap, MapMarker } from '@angular/google-maps';

type LocationState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

interface MapMarkerData {
  id: string;
  position: google.maps.LatLngLiteral;
  title: string;
}

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [
    ListingCardComponent,
    StateViewComponent,
    FilterBarComponent,
    ListingToggleComponent,
    GoogleMap,
    MapMarker,
  ],
  templateUrl: './discover.component.html',
})
export class DiscoverComponent implements AfterViewInit, OnDestroy {
  private readonly mockApi = inject(DiscoveryApiService);
  private readonly httpApi = inject(HttpDiscoveryApiService);
  private readonly locationService = inject(LocationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  // Map — center/zoom are signals so "Near me" can move them
  readonly center = signal<google.maps.LatLngLiteral>({ lat: 6.9271, lng: 79.8612 }); // Colombo
  readonly zoom = signal(12);

  // Google Maps health
  readonly googleMapsFailed = signal(false);
  private failureTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onMapsFailedEvent = () => this.googleMapsFailed.set(true);

  // Leaflet fallback — loaded lazily only in the browser
  @ViewChild('osmContainer') osmContainer?: ElementRef<HTMLDivElement>;
  private leaflet: typeof import('leaflet') | null = null;
  private leafletMap: import('leaflet').Map | null = null;

  private readonly pageSize = 12;
  readonly defaultRadiusKm = 2;

  readonly radiusOptions: { value: number; label: string }[] = [
    { value: 2,  label: '2 km' },
    { value: 5,  label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 50, label: '50 km' },
  ];

  readonly filters = signal<SearchFilters>({});
  readonly view = signal<DiscoveryView>('recommended');
  readonly page = signal(1);

  readonly items = signal<Listing[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Location state
  readonly locationState = signal<LocationState>('idle');
  readonly locationError = signal<string | null>(null);
  readonly nearActive = signal(false);
  readonly radiusKm = signal<number>(this.defaultRadiusKm);
  readonly detectedCity = signal<string | null>(null);
  readonly locationSource = signal<'gps' | 'ip' | 'none'>('none');
  readonly locationAccuracy = signal<'high' | 'city' | 'none'>('none');

  private lastLat: number | null = null;
  private lastLng: number | null = null;

  readonly result = computed(() => ({
    items: this.items(),
    total: this.total(),
  }));

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  // Markers derived from listings. Uses `lat`/`lng` from the Listing model.
  readonly markers = computed<MapMarkerData[]>(() =>
    this.items()
      .filter(l => l.lat != null && l.lng != null)
      .map(l => ({
        id: l.id,
        position: { lat: l.lat, lng: l.lng } as google.maps.LatLngLiteral,
        title: l.title,
      })),
  );

  constructor() {
    // Browser-only: subscribe to query params (skip on SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe((params) => {
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
    }

    effect(() => {
      if (this.nearActive()) return;

      // Skip data loading during SSR — let the browser fetch after hydration
      if (!isPlatformBrowser(this.platformId)) {
        this.loading.set(false);
        return;
      }

      const filters = this.filters();
      const view = this.view();
      const page = this.page();
      this.load(filters, view, page);
    });

    // Browser-only: listen for Google Maps auth failure and set a timeout
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('google-maps-failed', this.onMapsFailedEvent);

      this.failureTimer = setTimeout(() => {
        const g = (window as any).google;
        if (!g?.maps) {
          console.warn('[GoogleMaps] Script did not load within 6s — falling back to OSM');
          this.googleMapsFailed.set(true);
        }
      }, 6000);
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // When the failure signal flips, build/refresh the Leaflet map.
    effect(() => {
      if (this.googleMapsFailed()) {
        setTimeout(() => void this.initOrRefreshLeaflet(), 0);
      }
    });

    // If markers or center change while the fallback is active, refresh it
    effect(() => {
      const _m = this.markers();
      const _c = this.center();
      if (this.googleMapsFailed() && this.leafletMap) {
        this.refreshLeafletMarkers();
        this.leafletMap.setView([_c.lat, _c.lng], this.zoom());
      }
    });
  }

  ngOnDestroy(): void {
    if (this.failureTimer) {
      clearTimeout(this.failureTimer);
      this.failureTimer = null;
    }
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('google-maps-failed', this.onMapsFailedEvent);
    }
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = null;
    }
  }

  // Leaflet fallback (browser only, lazy loaded)

  private async loadLeafletIfNeeded(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.leaflet) {
      return;
    }

    const L = await import('leaflet');

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });

    this.leaflet = L;
  }

  private async initOrRefreshLeaflet(): Promise<void> {
    await this.loadLeafletIfNeeded();

    if (!this.leaflet || !this.osmContainer) {
      return;
    }

    const L = this.leaflet;

    if (this.leafletMap) {
      this.refreshLeafletMarkers();
      const c = this.center();
      this.leafletMap.setView([c.lat, c.lng], this.zoom());
      this.leafletMap.invalidateSize();
      return;
    }

    const c = this.center();
    this.leafletMap = L.map(this.osmContainer.nativeElement, {
      center: [c.lat, c.lng],
      zoom: this.zoom(),
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.leafletMap);

    this.refreshLeafletMarkers();
    setTimeout(() => this.leafletMap?.invalidateSize(), 50);
  }

  private refreshLeafletMarkers(): void {
    if (!this.leafletMap || !this.leaflet) return;

    const L = this.leaflet;

    this.leafletMap.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        this.leafletMap!.removeLayer(layer);
      }
    });

    for (const m of this.markers()) {
      const marker = L.marker([m.position.lat, m.position.lng]).addTo(this.leafletMap);
      marker.bindPopup(
        `<b>${this.escapeHtml(m.title)}</b><br>` +
        `<a href="/listings/${encodeURIComponent(m.id)}">View details</a>`,
      );
      marker.on('click', () => this.onMarkerClick(m.id));
    }
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Data loading

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

  async activateNearMe(): Promise<void> {
    this.locationState.set('requesting');
    this.locationError.set(null);

    try {
      const loc: ResolvedLocation = await this.locationService.resolve();
      this.applyLocation(loc);
    } catch (err) {
      console.error('Location resolution failed', err);
      this.locationState.set('error');
      this.locationError.set(
        'Could not determine your location. Please select a city manually.',
      );
    }
  }

  private applyLocation(loc: ResolvedLocation): void {
    this.lastLat = loc.lat;
    this.lastLng = loc.lng;
    this.detectedCity.set(loc.city ?? null);
    this.locationSource.set(loc.source);
    this.locationAccuracy.set(loc.accuracy);
    this.locationState.set('active');
    this.nearActive.set(true);

    this.center.set({ lat: loc.lat, lng: loc.lng });
    if (this.leafletMap) {
      this.leafletMap.setView([loc.lat, loc.lng], this.zoom());
    }

    if (loc.source === 'ip' && loc.city) {
      this.filters.update(f => ({ ...f, city: loc.city }));
    }

    this.refreshNear();
  }

  private refreshNear(): void {
    if (this.lastLat == null || this.lastLng == null) return;

    if (environment.useMockApi) {
      const result = this.mockApi.listByView('all', {});
      this.items.set(result.items);
      this.total.set(result.total);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.httpApi
      .fetchNearby(this.lastLat, this.lastLng, this.radiusKm(), this.filters())
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

  setRadius(km: number): void {
    this.radiusKm.set(km);
    if (this.nearActive()) {
      this.refreshNear();
    }
  }

  clearNearMe(): void {
    this.nearActive.set(false);
    this.locationState.set('idle');
    this.locationError.set(null);
    this.detectedCity.set(null);
    this.locationSource.set('none');
    this.locationAccuracy.set('none');
    this.lastLat = null;
    this.lastLng = null;
    this.load(this.filters(), this.view(), this.page());
  }

  onMarkerClick(listingId: string): void {
    this.router.navigate(['/listings', listingId]);
  }

  onFiltersChange(next: SearchFilters): void {
    this.filters.set(next);
    this.page.set(1);

    if (this.nearActive()) {
      this.refreshNear();
      return;
    }

    this.applyToUrl(next, this.view(), 1);
  }

  onViewChange(next: DiscoveryView): void {
    this.view.set(next);
    this.page.set(1);

    if (this.nearActive()) {
      this.nearActive.set(false);
      this.locationState.set('idle');
    }

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
