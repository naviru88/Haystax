import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe],
  templateUrl: './audit.component.html',
})
export class AuditComponent {
  private readonly api = inject(AdminApiService);

  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const all = this.api.auditLogs();
    if (!q) return all;
    return all.filter(l =>
      l.action.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      (l.actorDisplayName ?? '').toLowerCase().includes(q) ||
      (l.reason ?? '').toLowerCase().includes(q)
    );
  });

  setQuery(v: string): void {
    this.query.set(v);
  }
}
