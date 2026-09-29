import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Listing } from '../../../features/discovery/models/listing.model';

@Component({
  selector: 'app-listing-card',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './listing-card.component.html',
})
export class ListingCardComponent {
  readonly listing = input.required<Listing>();
}
