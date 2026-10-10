import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';
import { HttpAdminApiService } from '../services/http-admin-api.service';
import { environment } from '../../../../environments/environment';
import { Broadcast, BroadcastAudience } from '../models/broadcast.model';

type Audience = BroadcastAudience;

@Component({
  selector: 'app-admin-broadcasts',
  imports: [DatePipe],
  templateUrl: './broadcasts.component.html',
})
export class BroadcastsComponent {
  private readonly mockApi = inject(AdminApiService);
  private readonly httpApi = inject(HttpAdminApiService);

  readonly useMock = environment.useMockApi;

  private readonly _broadcasts = signal<Broadcast[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly broadcasts = computed(() => this._broadcasts());

  readonly formTitle = signal('');
  readonly formBody = signal('');
  readonly formAudience = signal<Audience>('all');
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  readonly audiences: { value: Audience; label: string }[] = [
    { value: 'all',     label: 'All users' },
    { value: 'owners',  label: 'Owners only' },
    { value: 'tenants', label: 'Tenants only' },
  ];

  constructor() {
    if (this.useMock) {
      this._broadcasts.set(this.mockApi.broadcasts());
      return;
    }
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.httpApi.fetchBroadcasts().subscribe({
      next: (b) => { this._broadcasts.set(b); this.loading.set(false); },
      error: (err) => { this.error.set('Failed to load broadcasts'); this.loading.set(false); console.error(err); },
    });
  }

  setTitle(v: string): void { this.formTitle.set(v); this.formError.set(null); this.formSuccess.set(null); }
  setBody(v: string):  void { this.formBody.set(v);  this.formError.set(null); this.formSuccess.set(null); }
  setAudience(v: Audience): void { this.formAudience.set(v); }

  send(): void {
    if (this.formTitle().trim().length < 3) {
      this.formError.set('Title must be at least 3 characters.');
      return;
    }
    if (this.formBody().trim().length < 10) {
      this.formError.set('Body must be at least 10 characters.');
      return;
    }

    const payload = {
      title: this.formTitle().trim(),
      body: this.formBody().trim(),
      audience: this.formAudience(),
    };

    if (this.useMock) {
      this.mockApi.sendBroadcast(payload);
      this._broadcasts.set(this.mockApi.broadcasts());
      this.afterSend();
    } else {
      this.httpApi.sendBroadcast(payload).subscribe({
        next: () => { this.reload(); this.afterSend(); },
        error: (err) => { this.formError.set('Failed to send broadcast'); console.error(err); },
      });
    }
  }

  private afterSend(): void {
    this.formTitle.set('');
    this.formBody.set('');
    this.formAudience.set('all');
    this.formError.set(null);
    this.formSuccess.set('Broadcast sent.');
  }

  statusTone(s: string): 'default' | 'warning' | 'success' {
    switch (s) {
      case 'sent':  return 'success';
      case 'draft': return 'warning';
      default:      return 'default';
    }
  }
}
