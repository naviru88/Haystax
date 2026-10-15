import { Routes } from '@angular/router';
import { OWNER_API } from './features/owner-identity/services/owner-api.interface';
import { MockAuthService } from './features/owner-identity/services/mock-auth.service';

export const routes: Routes = [
  {
    path: '',
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
    path: 'auth/login',
    providers: [
      // Week 1: mock provider. Week 4: replace with OwnerApiService (real API).
      { provide: OWNER_API, useClass: MockAuthService },
    ],
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
  { path: '**', redirectTo: '' },
];
