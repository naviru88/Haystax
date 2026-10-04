import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { HttpDiscoveryApiService } from '../services/http-discovery-api.service';
import { Listing } from '../models/listing.model';
import { Review } from '../models/review.model';
import { environment } from '../../../../environments/environment';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

@Component({
  selector: 'app-listing-details',
  imports: [RouterLink, DecimalPipe, DatePipe, RatingStarsComponent, StateViewComponent],
  templateUrl: './listing-details.component.html',
})
export class ListingDetailsComponent {
  private readonly mockApi = inject(DiscoveryApiService);
  private readonly httpApi = inject(HttpDiscoveryApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly Math = Math;

  readonly listing = signal<Listing | undefined>(undefined);
  readonly notFound = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activePhotoIndex = signal(0);

  /** Reviews for the current listing. Still mock-only (M3 owns the real API). */
  readonly reviews = signal<Review[]>([]);

  /** New-review form state. */
  readonly formRating = signal<number>(0);
  readonly formBody = signal<string>('');
  readonly formError = signal<string | null>(null);

  readonly primaryPhoto = computed(() => {
    const l = this.listing();
    if (!l || l.photos.length === 0) return null;
    return l.photos[this.activePhotoIndex()] ?? l.photos[0];
  });

  readonly starOptions = [1, 2, 3, 4, 5] as const;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      return;
    }

    if (environment.useMockApi) {
      const found = this.mockApi.getById(id);
      if (!found) {
        this.notFound.set(true);
      } else {
        this.listing.set(found);
        this.reviews.set(this.mockApi.getReviewsForListing(found.id));
      }
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.httpApi.fetchById(id).subscribe({
      next: (data) => {
        this.listing.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        if (err?.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set('Failed to load listing. Is the backend running?');
          console.error('Listing fetch failed', err);
        }
        this.loading.set(false);
      },
    });
  }

  setActivePhoto(i: number): void {
    this.activePhotoIndex.set(i);
  }

  setFormRating(n: number): void {
    this.formRating.set(n);
    this.formError.set(null);
  }

  setFormBody(v: string): void {
    this.formBody.set(v);
    this.formError.set(null);
  }

  submitReview(): void {
    const l = this.listing();
    if (!l) return;

    if (this.formRating() < 1 || this.formRating() > 5) {
      this.formError.set('Please select a star rating.');
      return;
    }
    if (this.formBody().trim().length === 0) {
      this.formError.set('Please write a short comment.');
      return;
    }

    const newReview: Review = {
      id: `r-${Date.now()}`,
      listingId: l.id,
      authorDisplayName: 'You',
      rating: this.formRating(),
      body: this.formBody().trim(),
      createdAt: new Date().toISOString(),
    };

    this.reviews.update((rs) => [newReview, ...rs]);
    this.formRating.set(0);
    this.formBody.set('');
    this.formError.set(null);
  }
}
