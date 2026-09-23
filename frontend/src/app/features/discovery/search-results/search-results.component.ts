import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { Listing, SearchFilters, GenderPolicy } from '../models/listing.model';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

@Component({
  selector: 'app-search-results',
  imports: [ListingCardComponent, StateViewComponent],
  templateUrl: './search-results.component.html',
})
export class SearchResultsComponent {
  private readonly api = inject(DiscoveryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly pageSize = 6;
  readonly page = signal(1);

  // Filters live in the URL query string so they're shareable
  readonly filters = signal<SearchFilters>({});
  readonly result = computed(() => this.api.search({ ...this.filters(), page: this.page(), pageSize: this.pageSize }));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.result().total / this.pageSize)));

  readonly cities = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Anuradhapura'];
  readonly genderOptions: { value: GenderPolicy | ''; label: string }[] = [
    { value: '', label: 'Any' },
    { value: 'any', label: 'Any gender' },
    { value: 'female_only', label: 'Female only' },
    { value: 'male_only', label: 'Male only' },
  ];
  readonly sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
  ];

  constructor() {
    // Read filters from URL on load
    this.route.queryParams.subscribe(params => {
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

  updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void {
    const next: SearchFilters = { ...this.filters(), [key]: value === '' ? undefined : value };
    this.page.set(1);
    this.applyToUrl(next, 1);
  }

  clearFilters(): void {
    this.filters.set({});
    this.page.set(1);
    this.applyToUrl({}, 1);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.applyToUrl(this.filters(), p);
  }

  private applyToUrl(filters: SearchFilters, page: number): void {
    const queryParams: Record<string, unknown> = {};
    if (filters.city) queryParams['city'] = filters.city;
    if (filters.minPrice != null) queryParams['minPrice'] = filters.minPrice;
    if (filters.maxPrice != null) queryParams['maxPrice'] = filters.maxPrice;
    if (filters.genderPolicy) queryParams['genderPolicy'] = filters.genderPolicy;
    if (filters.sort && filters.sort !== 'relevance') queryParams['sort'] = filters.sort;
    if (page > 1) queryParams['page'] = page;
    this.router.navigate([], { queryParams, replaceUrl: false });
  }
}
