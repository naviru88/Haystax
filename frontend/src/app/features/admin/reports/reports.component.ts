import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
import { HttpAdminApiService } from '../services/http-admin-api.service';
import { environment } from '../../../../environments/environment';
import { Report, ReportStatus } from '../models/report.model';
import { ModerationActionType } from '../models/moderation-action.model';
import { ReportDrawerComponent } from './report-drawer/report-drawer.component';
import { ModerationModalComponent } from './moderation-modal/moderation-modal.component';

type StatusFilter = ReportStatus | 'all';

@Component({
  selector: 'app-admin-reports',
  imports: [DatePipe, ReportDrawerComponent, ModerationModalComponent],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  private readonly mockApi = inject(AdminApiService);
  private readonly httpApi = inject(HttpAdminApiService);

  readonly useMock = environment.useMockApi;

  // Pre-wire: state populated from either source.
  private readonly _reports = signal<Report[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly statusFilter = signal<StatusFilter>('submitted');
  readonly selectedReport = signal<Report | null>(null);
  readonly modalOpen = signal(false);
  readonly modalTarget = signal<Report | null>(null);

  readonly filtered = computed(() => {
    const all = this._reports();
    const status = this.statusFilter();
    return status === 'all' ? all : all.filter(r => r.status === status);
  });

  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'submitted',    label: 'Submitted' },
    { value: 'under_review', label: 'Under review' },
    { value: 'resolved',     label: 'Resolved' },
    { value: 'rejected',     label: 'Rejected' },
    { value: 'all',          label: 'All' },
  ];

  constructor() {
    if (this.useMock) {
      this._reports.set(this.mockApi.reports());
      return;
    }
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.httpApi.fetchReports('all').subscribe({
      next: (reports) => {
        this._reports.set(reports);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load reports');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  setStatus(s: StatusFilter): void { this.statusFilter.set(s); }
  openReport(r: Report): void { this.selectedReport.set(r); }
  closeDrawer(): void { this.selectedReport.set(null); }

  openModeration(r: Report): void {
    this.modalTarget.set(r);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.modalTarget.set(null);
  }

  applyModeration(payload: { actionType: ModerationActionType; reason: string }): void {
    const target = this.modalTarget();
    if (!target) return;

    if (this.useMock) {
      this.mockApi.applyModeration({
        reportId: target.id,
        actionType: payload.actionType,
        reason: payload.reason,
      });
      this._reports.set(this.mockApi.reports());
    } else {
      this.httpApi
        .applyModeration({
          reportId: target.id,
          actionType: payload.actionType,
          reason: payload.reason,
        })
        .subscribe(() => this.reload());
    }

    this.modalOpen.set(false);
    this.modalTarget.set(null);
    this.selectedReport.set(null);
  }

  statusTone(status: string): 'default' | 'warning' | 'danger' | 'success' | 'primary' {
    switch (status) {
      case 'submitted':    return 'warning';
      case 'under_review': return 'primary';
      case 'resolved':     return 'success';
      case 'rejected':     return 'default';
      default:             return 'default';
    }
  }
}
