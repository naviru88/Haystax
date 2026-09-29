import { Component, inject, signal, computed } from '@angular/core';
import { AdminApiService } from '../services/admin-api.service';
import { StatCardComponent } from './stat-card/stat-card.component';
import { ActivityChartComponent } from './activity-chart/activity-chart.component';

type ActivityMetric = 'searches' | 'listingViews' | 'filtersApplied' | 'recommendationViews' | 'listingContacts';

@Component({
  selector: 'app-admin-overview',
  imports: [StatCardComponent, ActivityChartComponent],
  templateUrl: './overview.component.html',
})
export class OverviewComponent {
  private readonly api = inject(AdminApiService);

  readonly stats = this.api.getStats();

  readonly activityMetric = signal<ActivityMetric>('searches');
  readonly activity = computed(() => this.api.getActivity(30));

  readonly metricOptions: { key: ActivityMetric; label: string }[] = [
    { key: 'searches',            label: 'Searches' },
    { key: 'listingViews',        label: 'Listing views' },
    { key: 'filtersApplied',      label: 'Filters applied' },
    { key: 'recommendationViews', label: 'Recommendation views' },
    { key: 'listingContacts',     label: 'Listing contacts' },
  ];

  setMetric(m: ActivityMetric): void {
    this.activityMetric.set(m);
  }
}
