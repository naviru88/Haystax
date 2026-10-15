import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { OWNER_API } from '../services/owner-api.interface';
import { OwnerListing, UiState } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';
import { toApiError } from '../services/api-error';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

/**
 * Owner Dashboard — W3 skeleton (full interactive build is W3-C2).
 * Loads the owner's own listings via the OwnerApi (mock fixtures in mock mode, real API
 * otherwise). Pending tenancy requests are a read-only placeholder (Member 3's contract).
 * [AGENTS C3 scope][page contract §6]
 */
@Component({
  selector: 'app-owner-dashboard',
  imports: [RouterLink, DatePipe, StateViewComponent, PageHeaderComponent, SkeletonCardComponent],
  templateUrl: './owner-dashboard.component.html',
})
export class OwnerDashboardComponent implements OnInit {
  readonly api = inject(OWNER_API);

  readonly uiState = this.api.uiState;

  readonly user = computed<OwnerUser | undefined>(() => this.api.getCurrentUser());
  readonly listings = signal<OwnerListing[]>([]);
  readonly pendingRequests = computed(() => this.api.getPendingRequests());
  readonly loadFailed = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.listings.set(await this.api.listListings());
    } catch (e) {
      this.loadFailed.set(true);
      console.warn('Dashboard failed to load listings', toApiError(e).message);
    }
  }

  /** Switch the skeleton between UI states via the mock service. [AGENTS C3] */
  setUiState(state: UiState): void {
    this.api.setUiState(state);
  }

  statusLabel(s: OwnerListing['status']): string {
    switch (s) {
      case 'draft': return 'Draft';
      case 'pending_review': return 'Pending review';
      case 'published': return 'Published';
      case 'paused': return 'Paused';
      case 'removed': return 'Removed';
    }
  }

  formatPrice(a: number): string {
    return a.toLocaleString('en-LK');
  }
}