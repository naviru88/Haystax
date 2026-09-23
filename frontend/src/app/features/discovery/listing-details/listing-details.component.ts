import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { Listing } from '../models/listing.model';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

@Component({
  selector: 'app-listing-details',
  imports: [RouterLink, DecimalPipe, RatingStarsComponent, StateViewComponent],
  templateUrl: './listing-details.component.html',
})
export class ListingDetailsComponent {
  private readonly api = inject(DiscoveryApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly Math = Math;

  readonly listing = signal<Listing | undefined>(undefined);
  readonly notFound = signal(false);
  readonly activePhotoIndex = signal(0);

  readonly primaryPhoto = computed(() => {
    const l = this.listing();
    if (!l || l.photos.length === 0) return null;
    return l.photos[this.activePhotoIndex()] ?? l.photos[0];
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      return;
    }
    const found = this.api.getById(id);
    if (!found) {
      this.notFound.set(true);
    } else {
      this.listing.set(found);
    }
  }

  setActivePhoto(i: number): void {
    this.activePhotoIndex.set(i);
  }
}
