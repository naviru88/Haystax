import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { DiscoveryView, SearchFilters } from '../models/listing.model';
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
  private readonly api = inject(DiscoveryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly pageSize = 12;

  readonly filters = signal<SearchFilters>({});
  readonly view = signal<DiscoveryView>('recommended');
  readonly page = signal(1);

  readonly result = computed(() =>
    this.api.listByView(this.view(), {
      ...this.filters(),
      page: this.page(),
      pageSize: this.pageSize,
    })
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.result().total / this.pageSize))
  );

  constructor() {
    this.route.queryParams.subscribe(params => {
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
