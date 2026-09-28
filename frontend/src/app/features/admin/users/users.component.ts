import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
import { AdminUser } from '../models/admin-user.model';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  private readonly api = inject(AdminApiService);

  readonly query = signal('');
  readonly suspendTarget = signal<AdminUser | null>(null);
  readonly suspendReason = signal('');
  readonly suspendError = signal<string | null>(null);

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const all = this.api.users();
    if (!q) return all;
    return all.filter(u =>
      u.displayName.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  setQuery(v: string): void { this.query.set(v); }

  openSuspend(u: AdminUser): void {
    this.suspendTarget.set(u);
    this.suspendReason.set('');
    this.suspendError.set(null);
  }

  closeSuspend(): void {
    this.suspendTarget.set(null);
  }

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
    this.api.suspendUser(target.id, this.suspendReason().trim());
    this.suspendTarget.set(null);
  }

  unsuspend(u: AdminUser): void {
    this.api.unsuspendUser(u.id);
  }
}
