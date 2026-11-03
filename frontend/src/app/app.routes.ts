import { Routes } from '@angular/router';

import { authGuard } from './features/owner-identity/guards/auth.guard';
import { adminGuard } from './features/owner-identity/guards/admin.guard';
import { guestGuard } from './features/owner-identity/guards/guest.guard';

/**
 * Login-first routing.
 *
 * Opening the app (or any unknown/deep-linked URL) lands on /auth/login, because the
 * session guard on the shell route bounces anonymous users there. The app shell itself
 * lives inside this route table — so the auth page renders full-screen, and the sidebar
 * only appears once you have a session.
 *
 *   /auth/login      guestGuard  → signed-in users are sent straight to their landing page
 *   '' (shell)       authGuard   → everything below requires a session
 *     /discover      tenants land here after login
 *     /owner/**      authGuard + ownerGuard (roles come from GET /api/owner/auth/me)
 *     /admin/**      adminGuard
 *
 * Provider selection (mock vs real API, D-MOCK) is app-wide in app.config.ts, so the
 * MockAuthService session is the same instance on the login page and behind the guards.
 * [AGENTS-W3 §5][page contract §4]
 */
export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
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
