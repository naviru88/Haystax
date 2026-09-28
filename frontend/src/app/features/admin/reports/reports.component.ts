import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
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
  private readonly api = inject(AdminApiService);

  readonly statusFilter = signal<StatusFilter>('submitted');
  readonly selectedReport = signal<Report | null>(null);
  readonly modalOpen = signal(false);
  readonly modalTarget = signal<Report | null>(null);

  readonly filtered = computed(() =>
    this.api.getReportsByStatus(this.statusFilter())
  );

  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'submitted',    label: 'Submitted' },
    { value: 'under_review', label: 'Under review' },
    { value: 'resolved',     label: 'Resolved' },
    { value: 'rejected',     label: 'Rejected' },
    { value: 'all',          label: 'All' },
  ];

  setStatus(s: StatusFilter): void {
    this.statusFilter.set(s);
  }

  openReport(r: Report): void {
    this.selectedReport.set(r);
  }

  closeDrawer(): void {
    this.selectedReport.set(null);
  }

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

    this.api.applyModeration({
      reportId: target.id,
      actionType: payload.actionType,
      reason: payload.reason,
    });

    // Close modal, then close drawer (report now has a new status).
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
