import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiscoveryApiService } from '../services/discovery-api.service';
import { Listing } from '../models/listing.model';
import { ListingCardComponent } from '../../../shared/components/listing-card/listing-card.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ListingCardComponent, StateViewComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly api = inject(DiscoveryApiService);
  readonly featured = signal<Listing[]>(this.api.getFeatured(6));
  readonly popularCities = ['Colombo', 'Kandy', 'Galle', 'Negombo'];
}
