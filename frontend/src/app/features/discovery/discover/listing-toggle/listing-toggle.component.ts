import { Component, input, output } from '@angular/core';
import { DiscoveryView } from '../../models/listing.model';

@Component({
  selector: 'app-listing-toggle',
  templateUrl: './listing-toggle.component.html',
})
export class ListingToggleComponent {
  readonly value = input.required<DiscoveryView>();
  readonly valueChange = output<DiscoveryView>();
}
