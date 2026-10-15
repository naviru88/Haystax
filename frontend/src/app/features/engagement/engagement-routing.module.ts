import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BookingComponent } from './booking/booking.component';
import { MessagingComponent } from './messaging/messaging.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { AnalyticsComponent } from './analytics/analytics.component';

const routes: Routes = [
  { path: 'booking', component: BookingComponent },
  { path: 'messaging', component: MessagingComponent },
  { path: 'reviews', component: ReviewsComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: '', redirectTo: 'booking', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EngagementRoutingModule { }
