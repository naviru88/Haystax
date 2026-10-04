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

  readonly filters = signal<SearchFilters>({});
  readonly view = signal<DiscoveryView>('recommended');
  readonly page = signal(1);

  //Populated by whichever path is active — mock or HTTP.
  readonly items = signal<Listing[]>([]);
  readonly total = signal(0);

  //Loading state for the HTTP path.
  readonly loading = signal(false);

  //Error message for the HTTP path.
  readonly error = signal<string | null>(null);

  //Template-facing shape.
  readonly result = computed(() => ({
    items: this.items(),
    total: this.total(),
  }));

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  constructor() {
    // Read filters, view, and page from the URL on load and on every change.
    this.route.queryParams.subscribe((params) => {
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

    // Reload whenever filters, view, or page change.
    effect(() => {
      const filters = this.filters();
      const view = this.view();
      const page = this.page();
      this.load(filters, view, page);
    });
  }

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

    // If the user hasn't picked an explicit sort, derive it from the view
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

  onFiltersChange(next: SearchFilters): void {
    this.page.set(1);
    this.applyToUrl(next, this.view(), 1);
  }

  onViewChange(next: DiscoveryView): void {
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
