import { Component, effect, inject, signal } from '@angular/core';
import { AdminApiService } from '../services/admin-api.service';
import { HttpAdminApiService } from '../services/http-admin-api.service';
import { AdminStats, DailyActivity } from '../models/admin-stats.model';
import { environment } from '../../../../environments/environment';
import { StatCardComponent } from './stat-card/stat-card.component';
import { ActivityChartComponent } from './activity-chart/activity-chart.component';

type ActivityMetric = 'searches' | 'listingViews' | 'filtersApplied' | 'recommendationViews' | 'listingContacts';

const EMPTY_STATS: AdminStats = {
  submittedReportCount: 0,
  underReviewReportCount: 0,
  resolvedReportCount: 0,
  rejectedReportCount: 0,
  pendingListingCount: 0,
  removedListingCount: 0,
  suspendedUserCount: 0,
  publishedListingCount: 0,
  activeTenancyCount: 0,
  totalUserCount: 0,
};

@Component({
  selector: 'app-admin-overview',
  imports: [StatCardComponent, ActivityChartComponent],
  templateUrl: './overview.component.html',
})
export class OverviewComponent {
  private readonly mockApi = inject(AdminApiService);
  private readonly httpApi = inject(HttpAdminApiService);

  // Signals — populated by whichever path is active.
  readonly stats = signal<AdminStats>(EMPTY_STATS);
  readonly activity = signal<DailyActivity[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly activityMetric = signal<ActivityMetric>('searches');

  readonly metricOptions: { key: ActivityMetric; label: string }[] = [
    { key: 'searches',            label: 'Searches' },
    { key: 'listingViews',        label: 'Listing views' },
    { key: 'filtersApplied',      label: 'Filters applied' },
    { key: 'recommendationViews', label: 'Recommendation views' },
    { key: 'listingContacts',     label: 'Listing contacts' },
  ];

  constructor() {
    if (environment.useMockApi) {
      this.stats.set(this.mockApi.getStats());
      this.activity.set(this.mockApi.getActivity(30));
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.httpApi.fetchStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load stats');
        this.loading.set(false);
        console.error(err);
      },
    });

    this.httpApi.fetchActivity(30).subscribe({
      next: (a) => this.activity.set(a),
      error: (err) => console.error('Activity fetch failed', err),
    });
  }

  setMetric(m: ActivityMetric): void {
    this.activityMetric.set(m);
  }
}
