import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
import { HttpAdminApiService } from '../services/http-admin-api.service';
import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-user.model';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  private readonly mockApi = inject(AdminApiService);
  private readonly httpApi = inject(HttpAdminApiService);

  readonly useMock = environment.useMockApi;

  private readonly _users = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly suspendTarget = signal<AdminUser | null>(null);
  readonly suspendReason = signal('');
  readonly suspendError = signal<string | null>(null);

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const all = this._users();
    if (!q) return all;
    return all.filter(u =>
      u.displayName.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  constructor() {
    if (this.useMock) {
      this._users.set(this.mockApi.users());
      return;
    }
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.httpApi.fetchUsers().subscribe({
      next: (u) => { this._users.set(u); this.loading.set(false); },
      error: (err) => { this.error.set('Failed to load users'); this.loading.set(false); console.error(err); },
    });
  }

  setQuery(v: string): void { this.query.set(v); }

  openSuspend(u: AdminUser): void {
    this.suspendTarget.set(u);
    this.suspendReason.set('');
    this.suspendError.set(null);
  }

  closeSuspend(): void { this.suspendTarget.set(null); }

  setSuspendReason(v: string): void {
    this.suspendReason.set(v);
    this.suspendError.set(null);
  }

  confirmSuspend(): void {
    const target = this.suspendTarget();
    if (!target) return;
    if (this.suspendReason().trim().length === 0) {
      this.suspendError.set('A reason is required.');
      return;
    }
    const reason = this.suspendReason().trim();

    if (this.useMock) {
      this.mockApi.suspendUser(target.id, reason);
      this._users.set(this.mockApi.users());
      this.suspendTarget.set(null);
    } else {
      this.httpApi.suspendUser(target.id, reason).subscribe(() => {
        this.reload();
        this.suspendTarget.set(null);
      });
    }
  }

  unsuspend(u: AdminUser): void {
    if (this.useMock) {
      this.mockApi.unsuspendUser(u.id);
      this._users.set(this.mockApi.users());
    } else {
      this.httpApi.unsuspendUser(u.id).subscribe(() => this.reload());
    }
  }
}
