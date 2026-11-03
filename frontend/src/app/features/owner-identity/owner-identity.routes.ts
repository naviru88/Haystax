import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { ownerGuard } from './guards/owner.guard';

/**
 * Owner & Identity routes — W3. Provider selection (mock vs real API) is environment-driven
 * (D-MOCK). Owner pages sit behind authGuard + ownerGuard; non-owners land on the
 * authorization state (/owner/required) with the Become-an-owner action (D-OWNER).
 * [AGENTS-W3 §5][page contract §6]
 */
export const ownerIdentityRoutes: Routes = [
  {
    path: '',
    // OwnerApi comes from app.config.ts (one shared instance across login + guarded pages).
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard, ownerGuard],
        loadComponent: () =>
          import('./owner-dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent),
      },
      {
        path: 'required',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./owner-required/owner-required.component').then(m => m.OwnerRequiredComponent),
      },
      {
        path: 'listings/new',
        canActivate: [authGuard, ownerGuard],
        loadComponent: () =>
          import('./listing-editor/listing-editor.component').then(m => m.ListingEditorComponent),
      },
      {
        path: 'listings/:id',
        canActivate: [authGuard, ownerGuard],
        loadComponent: () =>
          import('./listing-editor/listing-editor.component').then(m => m.ListingEditorComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];