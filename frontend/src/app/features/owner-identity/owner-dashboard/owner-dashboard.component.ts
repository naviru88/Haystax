import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OWNER_API } from '../services/owner-api.interface';
import { OwnerListing, UiState } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

/**
 * Owner Dashboard — Week 1 skeleton.
 * Shows: profile banner, pending tenancy requests (MOWN-07, read-only in Week 1),
 * the owner's own listings table (MOWN-01) with moderation & vacancy state, and a
 * suspended-account state. Loading/empty/error/success are switchable via the mock
 * service's uiState. [AGENTS C3 scope]
 */
@Component({
  selector: 'app-owner-dashboard',
  imports: [RouterLink, DatePipe, StateViewComponent, PageHeaderComponent, SkeletonCardComponent],
  templateUrl: './owner-dashboard.component.html',
})
export class OwnerDashboardComponent {
  readonly api = inject(OWNER_API);

  readonly uiState = this.api.uiState;

  readonly user = computed<OwnerUser | undefined>(() => this.api.getCurrentUser());
  readonly listings = computed<OwnerListing[]>(() => this.api.getMyListings());
  readonly pendingRequests = computed(() => this.api.getPendingRequests());

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
}
