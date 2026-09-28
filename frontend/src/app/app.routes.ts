import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/discovery/discover/discover.component')
        .then(m => m.DiscoverComponent),
  },
  { path: 'search',          redirectTo: '/', pathMatch: 'full' },
  { path: 'recommendations', redirectTo: '/', pathMatch: 'full' },
  {
    path: 'listings/:id',
    loadComponent: () =>
      import('./features/discovery/listing-details/listing-details.component')
        .then(m => m.ListingDetailsComponent),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  { path: '**', redirectTo: '' },
];
