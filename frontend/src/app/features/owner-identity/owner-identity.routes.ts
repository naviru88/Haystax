import { Routes } from '@angular/router';
import { OWNER_API } from './services/owner-api.interface';
import { MockAuthService } from './services/mock-auth.service';

export const ownerIdentityRoutes: Routes = [
  {
    path: '',
    providers: [
      // Week 1: mock provider. Week 4: replace with OwnerApiService (real API).
      { provide: OWNER_API, useClass: MockAuthService },
    ],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./owner-dashboard/owner-dashboard.component').then(
            m => m.OwnerDashboardComponent
          ),
      },
      {
        path: 'listings/new',
        loadComponent: () =>
          import('./listing-editor/listing-editor.component').then(
            m => m.ListingEditorComponent
          ),
      },
      {
        path: 'listings/:id',
        loadComponent: () =>
          import('./listing-editor/listing-editor.component').then(
            m => m.ListingEditorComponent
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
