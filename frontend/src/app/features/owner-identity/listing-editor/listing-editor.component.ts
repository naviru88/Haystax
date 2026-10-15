import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { OWNER_API } from '../services/owner-api.interface';
import { ListingStatus, OwnerListing, UiState } from '../models/owner-listing.model';
import { toApiError } from '../services/api-error';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

/**
 * Listing Editor — W3 skeleton (full form build is W3-C3).
 * Create (/owner/listings/new) and edit (/owner/listings/:id). Always shows the listing
 * title + location (C1 acceptance). Stale/invalid IDs show a safe error state and never
 * touch another listing. [AGENTS C3]
 */
@Component({
  selector: 'app-listing-editor',
  imports: [StateViewComponent, PageHeaderComponent, SkeletonCardComponent],
  templateUrl: './listing-editor.component.html',
})
export class ListingEditorComponent implements OnInit {
  private readonly api = inject(OWNER_API);
  private readonly route = inject(ActivatedRoute);

  readonly isNew = signal(false);
  readonly notFound = signal(false);
  readonly listingId = signal<string | null>(null);
  readonly uiState = this.api.uiState;

  readonly listing = signal<OwnerListing | undefined>(undefined);

  async ngOnInit(): Promise<void> {
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw === 'new') {
      this.isNew.set(true);
      return;
    }
    if (!raw) {
      this.notFound.set(true);
      return;
    }
    this.listingId.set(raw);

    try {
      const l = await this.api.getListing(raw);
      this.listing.set(l);
    } catch (e) {
      const err = toApiError(e);
      // 404 (or mock "not found") → safe state; anything else shows the generic error state.
      this.notFound.set(err.status === 404 || err.message.includes('not found'));
      console.warn('Editor failed to load listing', err.message);
    }
  }

  setUiState(state: UiState): void {
    this.api.setUiState(state);
  }

  statusLabel(s: ListingStatus): string {
    switch (s) {
      case 'draft': return 'Draft';
      case 'pending_review': return 'Pending review';
      case 'published': return 'Published';
      case 'paused': return 'Paused';
      case 'removed': return 'Removed';
    }
  }
}