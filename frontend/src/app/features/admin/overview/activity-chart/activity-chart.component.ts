import { Component, computed, input } from '@angular/core';
import { DailyActivity } from '../../models/admin-stats.model';

type Metric = 'searches' | 'listingViews' | 'filtersApplied' | 'recommendationViews' | 'listingContacts';

interface MetricOption {
  key: Metric;
  label: string;
}

@Component({
  selector: 'app-activity-chart',
  templateUrl: './activity-chart.component.html',
})
export class ActivityChartComponent {
  readonly data = input.required<DailyActivity[]>();
  readonly metric = input<Metric>('searches');

  readonly metrics: MetricOption[] = [
    { key: 'searches',            label: 'Searches' },
    { key: 'listingViews',        label: 'Listing views' },
    { key: 'filtersApplied',      label: 'Filters applied' },
    { key: 'recommendationViews', label: 'Recommendation views' },
    { key: 'listingContacts',     label: 'Listing contacts' },
  ];

  /** Rows ordered oldest → newest for left-to-right display. */
  readonly orderedData = computed(() =>
    [...this.data()].sort((a, b) => a.day.localeCompare(b.day))
  );

  readonly maxValue = computed(() =>
    Math.max(1, ...this.orderedData().map(d => d[this.metric()] ?? 0))
  );

  barHeight(value: number): number {
    return Math.max(2, (value / this.maxValue()) * 140);
  }

  shortDay(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}
