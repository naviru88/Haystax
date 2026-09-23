import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EngagementRoutingModule } from './engagement-routing.module';
import { BookingComponent } from './booking/booking.component';
import { MessagingComponent } from './messaging/messaging.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { AnalyticsComponent } from './analytics/analytics.component';

@NgModule({
  declarations: [
    BookingComponent,
    MessagingComponent,
    ReviewsComponent,
    AnalyticsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    EngagementRoutingModule
  ]
})
export class EngagementModule { }
