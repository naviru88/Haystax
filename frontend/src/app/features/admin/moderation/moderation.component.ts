import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
import { HttpAdminApiService } from '../services/http-admin-api.service';
import { environment } from '../../../../environments/environment';
import { ModerationAction } from '../models/moderation-action.model';

@Component({
  selector: 'app-admin-moderation',
  imports: [DatePipe],
  templateUrl: './moderation.component.html',
})
export class ModerationComponent {
  private readonly mockApi = inject(AdminApiService);
  private readonly httpApi = inject(HttpAdminApiService);

  readonly useMock = environment.useMockApi;

  private readonly _actions = signal<ModerationAction[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly actions = computed(() => this._actions());

  constructor() {
    if (this.useMock) {
      this._actions.set(this.mockApi.moderationActions());
      return;
    }
    this.loading.set(true);
    this.httpApi.fetchModerationActions().subscribe({
      next: (a) => { this._actions.set(a); this.loading.set(false); },
      error: (err) => { this.error.set('Failed to load moderation actions'); this.loading.set(false); console.error(err); },
    });
  }

  actionTone(t: string): 'default' | 'warning' | 'danger' | 'success' {
    switch (t) {
      case 'warning':
      case 'unpublish_listing': return 'warning';
      case 'remove_listing':
      case 'restrict_owner':    return 'danger';
      case 'restore_listing':   return 'success';
      default:                  return 'default';
    }
  }
}
