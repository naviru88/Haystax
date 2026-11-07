import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngagementApiService } from '../services/engagement-api.service';
import { AnalyticsSummary } from '../../../core/models/review.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    PageHeaderComponent,
    SkeletonCardComponent
  ],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit {
  listingId = 'b1111111-0000-0000-0000-000000000101';
  fromDate = '';
  toDate = '';

  loading = true;
  errorMessage = '';

  summary: AnalyticsSummary = {
    listingId: this.listingId,
    totalInquiries: 0,
    totalBookings: 0,
    occupancyRate: 0,
    estimatedRevenue: 0,
    averageRating: null
  };

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.getAnalyticsSummary(this.listingId, this.fromDate || undefined, this.toDate || undefined)
      .subscribe({
        next: (data) => {
          this.summary = data;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Could not load analytics data. Ensure you have owner access for this listing.';
          this.loading = false;
        }
      });
  }
}
