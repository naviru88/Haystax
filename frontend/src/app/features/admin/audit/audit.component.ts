import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
import { HttpAdminApiService } from '../services/http-admin-api.service';
import { environment } from '../../../../environments/environment';
import { AuditLog } from '../models/audit-log.model';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe],
  templateUrl: './audit.component.html',
})
export class AuditComponent {
  private readonly mockApi = inject(AdminApiService);
  private readonly httpApi = inject(HttpAdminApiService);

  readonly useMock = environment.useMockApi;

  private readonly _logs = signal<AuditLog[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const all = this._logs();
    if (!q) return all;
    return all.filter(l =>
      l.action.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      (l.actorDisplayName ?? '').toLowerCase().includes(q) ||
      (l.reason ?? '').toLowerCase().includes(q)
    );
  });

  constructor() {
    if (this.useMock) {
      this._logs.set(this.mockApi.auditLogs());
      return;
    }
    this.loading.set(true);
    this.httpApi.fetchAuditLogs().subscribe({
      next: (l) => { this._logs.set(l); this.loading.set(false); },
      error: (err) => { this.error.set('Failed to load audit logs'); this.loading.set(false); console.error(err); },
    });
  }

  setQuery(v: string): void { this.query.set(v); }
}
