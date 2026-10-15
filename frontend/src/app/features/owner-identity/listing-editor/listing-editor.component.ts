import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OWNER_API } from '../services/owner-api.interface';
import { ListingStatus, UiState } from '../models/owner-listing.model';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

/**
 * Listing Editor — Week 1 skeleton. Create (/owner/listings/new) and edit (/owner/listings/:id).
 * Always shows the listing title + location (C1 acceptance). Stale/invalid IDs show a safe
 * error state and never touch another listing. No finished forms this week. [AGENTS §0 rule 8]
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

  readonly listing = computed(() => {
    const id = this.listingId();
    if (!id) return undefined;
    return this.api.getListingById(id);
  });

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw === 'new') {
      this.isNew.set(true);
      return;
    }
    if (raw) {
      this.listingId.set(raw);
      this.notFound.set(!this.api.getListingById(raw));
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
