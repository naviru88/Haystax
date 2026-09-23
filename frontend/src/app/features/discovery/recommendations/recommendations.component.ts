import { Component, computed, inject } from '@angular/core';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { Listing } from '../models/listing.model';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

@Component({
  selector: 'app-recommendations',
  imports: [ListingCardComponent, StateViewComponent],
  templateUrl: './recommendations.component.html',
})
export class RecommendationsComponent {
  private readonly api = inject(DiscoveryApiService);

  readonly recommended = computed<Listing[]>(() => this.api.getRecommendations(9));

  /** Human-readable reason for each card */
  reasonFor(l: Listing): string {
    const reasons: string[] = [];
    if (l.availableSlots > 0) reasons.push('Available now');
    if ((l.ratingSummary?.averageRating ?? 0) >= 4.5) reasons.push('Highly rated');
    if (l.availableSlots >= 3) reasons.push('Plenty of space');
    return reasons.join(' · ') || 'Suggested for you';
  }
}
