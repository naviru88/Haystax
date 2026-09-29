import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Report } from '../../models/report.model';

@Component({
  selector: 'app-report-drawer',
  imports: [DatePipe],
  templateUrl: './report-drawer.component.html',
})
export class ReportDrawerComponent {
  readonly report = input<Report | null>(null);
  readonly close = output<void>();
  readonly moderate = output<Report>();

  statusTone(status: string): 'default' | 'warning' | 'danger' | 'success' | 'primary' {
    switch (status) {
      case 'submitted':    return 'warning';
      case 'under_review': return 'primary';
      case 'resolved':     return 'success';
      case 'rejected':     return 'default';
      default:             return 'default';
    }
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }
}
