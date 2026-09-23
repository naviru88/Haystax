import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/discovery/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/discovery/search-results/search-results.component').then(m => m.SearchResultsComponent),
  },
  {
    path: 'listings/:id',
    loadComponent: () =>
      import('./features/discovery/listing-details/listing-details.component').then(m => m.ListingDetailsComponent),
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./features/discovery/recommendations/recommendations.component').then(m => m.RecommendationsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
