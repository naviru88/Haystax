import { Routes } from '@angular/router';

import { authGuard } from './features/owner-identity/guards/auth.guard';
import { adminGuard } from './features/owner-identity/guards/admin.guard';
import { guestGuard } from './features/owner-identity/guards/guest.guard';

// Login-first routing.
export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/owner-identity/auth/auth.component')
        .then(m => m.AuthComponent),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'owner',
    loadChildren: () =>
      import('./features/owner-identity/owner-identity.routes')
        .then(m => m.ownerIdentityRoutes),
  },
  // M3: Engagement feature (messaging, reviews, analytics, booking)
  {
    path: 'messages',
    loadComponent: () =>
      import('./features/engagement/messaging/messaging.component').then(
        m => m.MessagingComponent
      import('./features/owner-identity/auth/auth.component').then(
        m => m.AuthComponent
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/app-shell/app-shell.component').then(
        m => m.AppShellComponent
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'discover' },
      {
        path: 'discover',
        loadComponent: () =>
          import('./features/discovery/discover/discover.component').then(
            m => m.DiscoverComponent
          ),
      },
      {
        path: 'listings/:id',
        loadComponent: () =>
          import('./features/discovery/listing-details/listing-details.component').then(
            m => m.ListingDetailsComponent
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/admin/admin.routes').then(m => m.adminRoutes),
      },
      {
        path: 'owner',
        loadChildren: () =>
          import('./features/owner-identity/owner-identity.routes')
            .then(m => m.ownerIdentityRoutes),
      },
      // M3: Engagement feature (messaging, reviews, analytics, booking)
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/engagement/messaging/messaging.component').then(
            m => m.MessagingComponent
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/engagement/analytics/analytics.component').then(
            m => m.AnalyticsComponent
          ),
      },
      {
        path: 'booking',
        loadComponent: () =>
          import('./features/engagement/booking/booking.component').then(
            m => m.BookingComponent
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/engagement/reviews/reviews.component').then(
            m => m.ReviewsComponent
          ),
      },
    ],
  },
  // Unknown URL → the front door, which is the login page.
  { path: '**', redirectTo: 'auth/login' },
];
