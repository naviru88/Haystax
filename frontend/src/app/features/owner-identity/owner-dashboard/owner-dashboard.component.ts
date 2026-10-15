import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OWNER_API } from '../services/owner-api.interface';
import { OwnerListing } from '../models/owner-listing.model';
import { OwnerUser } from '../models/owner-user.model';
import { toApiError } from '../services/api-error';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

/**
 * Owner Dashboard — W3-C2 [OWN-08][MOWN-01][MOWN-03][MOWN-07].
 * Single page state: loading | ready | empty | error | forbidden | suspended.
 * Loads /auth/me + /listings together; rows show status, moderation_note, clamped vacancy,
 * price and a primary-photo thumbnail (getPhotoBlob -> object URL, revoked on destroy).
 * Publish (draft/paused only) goes through a confirm dialog; 422 fieldErrors become the
 * readable "Missing…" list, 409 shows the server message. Removed listings have no actions
 * except viewing. Pending tenancy requests stay a placeholder (Member 3's contract).
 * [AGENTS-W3 W3-C2][page contract §6]
 */
export type DashboardState = 'loading' | 'ready' | 'empty' | 'error' | 'forbidden' | 'suspended';

@Component({
  selector: 'app-owner-dashboard',
  imports: [RouterLink, PageHeaderComponent, SkeletonCardComponent, StateViewComponent],
  templateUrl: './owner-dashboard.component.html',
})
export class OwnerDashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(OWNER_API);

  readonly state = signal<DashboardState>('loading');
  readonly me = signal<OwnerUser | undefined>(undefined);
  readonly listings = signal<OwnerListing[]>([]);
  readonly errorMessage = signal('');

  readonly isOwner = computed(() => this.me()?.is_owner ?? false);
  readonly isSuspended = computed(() => this.me()?.is_suspended ?? false);

  /** listingId -> object URL of the primary photo. Revoked on reload/destroy. */
  readonly thumbnails = signal<Record<string, string>>({});
  private readonly objectUrls = new Map<string, string>();

  // Forbidden state (D-OWNER): Become an owner button.
  readonly becomingOwner = signal(false);
  readonly becomeOwnerError = signal<string | null>(null);

  // Submit-for-publication confirm dialog.
  readonly publishTarget = signal<OwnerListing | null>(null);
  readonly publishing = signal(false);
  readonly publishMessage = signal<string | null>(null);   // 409 / server message
  readonly publishMissing = signal<string[]>([]);          // 422 fieldErrors as readable list

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    this.revokeAllThumbnails();
  }

  /** Load /auth/me + /listings together; derive the page state. [W3-C2.1] */
  async load(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set('');
    this.revokeAllThumbnails();

    try {
      const me = await this.api.getMe();
      this.me.set(me);

      let listings: OwnerListing[] = [];
      try {
        listings = await this.api.listListings();
      } catch (e) {
        // Non-owner hitting the listings endpoint → forbidden, not a crash. [W3-C2.4]
        if (me.is_owner) throw e;
      }

      if (me.is_suspended) {
        this.listings.set(listings);
        this.state.set('suspended');        // read-only: banner + list, no actions [W3-C2.5]
      } else if (!me.is_owner) {
        this.state.set('forbidden');        // fallback: guard normally redirects first [W3-C2.4]
        return;
      } else if (listings.length === 0) {
        this.state.set('empty');
      } else {
        this.listings.set(listings);
        this.state.set('ready');
      }

      await this.loadThumbnails(listings);
    } catch (err) {
      const e = toApiError(err);
      this.errorMessage.set(e.message || 'Could not load your dashboard.');
      this.state.set('error');
    }
  }

  /** Become an owner (D-OWNER), then reload /me and show the dashboard. [W3-C2.4] */
  async becomeOwner(): Promise<void> {
    if (this.becomingOwner()) return;
    this.becomingOwner.set(true);
    this.becomeOwnerError.set(null);
    try {
      await this.api.becomeOwner();
      await this.load();
    } catch (err) {
      const e = toApiError(err);
      this.becomeOwnerError.set(e.message || 'Could not become an owner. Please try again.');
    } finally {
      this.becomingOwner.set(false);
    }
  }

  // ---------- Submit for publication ----------
  openPublishDialog(l: OwnerListing): void {
    this.publishTarget.set(l);
    this.publishMessage.set(null);
    this.publishMissing.set([]);
  }

  closePublishDialog(): void {
    if (this.publishing()) return;          // never close mid-flight
    this.publishTarget.set(null);
    this.publishMessage.set(null);
    this.publishMissing.set([]);
  }

  async confirmPublish(): Promise<void> {
    const target = this.publishTarget();
    if (!target || this.publishing()) return;
    this.publishing.set(true);
    this.publishMessage.set(null);
    this.publishMissing.set([]);

    try {
      const updated = await this.api.publishListing(target.id);
      this.listings.update(list => list.map(l => (l.id === updated.id ? updated : l)));
      this.publishTarget.set(null);
    } catch (err) {
      const e = toApiError(err);
      if (e.kind === 'validation' && e.fieldErrors.length > 0) {
        // Readable "Missing…" list from 422 fieldErrors (e.g. "At least one photo is required").
        this.publishMissing.set(e.fieldErrors.map(fe => fe.message));
      } else {
        this.publishMessage.set(e.message || 'Could not submit for publication.');
      }
    } finally {
      this.publishing.set(false);
    }
  }

  // ---------- Thumbnails (D-PHOTOVIEW) ----------
  private async loadThumbnails(listings: OwnerListing[]): Promise<void> {
    const next: Record<string, string> = {};
    for (const l of listings) {
      const photo = l.photos.find(p => p.is_primary) ?? l.photos[0];
      if (!photo) continue;
      try {
        const blob = await this.api.getPhotoBlob(l.id, photo.id);
        const url = URL.createObjectURL(blob);
        this.objectUrls.set(l.id, url);
        next[l.id] = url;
      } catch {
        // Failed blob → the template falls back to the placeholder icon. [W3-C2 tests]
      }
    }
    this.thumbnails.set(next);
  }

  private revokeAllThumbnails(): void {
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.thumbnails.set({});
  }

  // ---------- Display helpers ----------
  statusLabel(s: OwnerListing['status']): string {
    switch (s) {
      case 'draft': return 'Draft';
      case 'pending_review': return 'Under review';
      case 'published': return 'Published';
      case 'paused': return 'Paused';
      case 'removed': return 'Removed';
    }
  }

  /** Badge colours: pending_review gets a clear "Under review" style. [W3-C2.2] */
  statusBadgeClass(s: OwnerListing['status']): string {
    switch (s) {
      case 'published': return '!bg-success-bg !text-success-text';
      case 'pending_review': return '!bg-warning-bg !text-warning-text';
      case 'removed': return '!bg-destructive-bg !text-destructive-text';
      case 'paused': return '!bg-gray-200 !text-gray-700';
      default: return '';
    }
  }

  /** Vacancy is display-clamped to 0..total_slots; never negative/above capacity. [W3-C2.2] */
  clampedVacancy(l: OwnerListing): { available: number; total: number } {
    const total = Math.max(0, l.total_slots);
    const available = Math.min(Math.max(0, l.available_slots), total);
    return { available, total };
  }

  formatPrice(a: number): string {
    return a.toLocaleString('en-LK');
  }
}
