import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { AnalyticsComponent } from './analytics/analytics.component';
import { BookingComponent } from './booking/booking.component';
import { MessagingComponent } from './messaging/messaging.component';
import { ReviewsComponent } from './reviews/reviews.component';

const routes: Routes = [
  { path: '', component: MessagingComponent },
  // If the components below are routed individually, move them to their own entries
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    AnalyticsComponent,
    BookingComponent,
    MessagingComponent,
    ReviewsComponent,
  ],
})
export class EngagementModule {}
