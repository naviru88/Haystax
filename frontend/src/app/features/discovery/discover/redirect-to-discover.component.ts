import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DiscoveryView } from '../models/listing.model';

@Component({
  selector: 'app-redirect-to-discover',
  template: '',
})
export class RedirectToDiscoverComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const view = (this.route.snapshot.data['view'] as DiscoveryView) ?? 'recommended';
    this.router.navigate(['/'], {
      queryParams: view === 'all' ? { view: 'all' } : {},
      replaceUrl: true,
    });
  }
}
