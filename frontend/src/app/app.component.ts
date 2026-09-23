import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <nav style="background: #1976d2; padding: 16px; color: white; display: flex; gap: 20px;">
      <strong style="font-size: 18px;">Haystax Member 3</strong>
      <a routerLink="/engagement/booking" style="color: white; text-decoration: none;">Bookings</a>
      <a routerLink="/engagement/messaging" style="color: white; text-decoration: none;">Messages</a>
      <a routerLink="/engagement/reviews" style="color: white; text-decoration: none;">Reviews</a>
      <a routerLink="/engagement/analytics" style="color: white; text-decoration: none;">Analytics</a>
    </nav>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {}
