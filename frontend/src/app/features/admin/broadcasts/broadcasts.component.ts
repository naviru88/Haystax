import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';

type Audience = 'all' | 'owners' | 'tenants';

@Component({
  selector: 'app-admin-broadcasts',
  imports: [DatePipe],
  templateUrl: './broadcasts.component.html',
})
export class BroadcastsComponent {
  private readonly api = inject(AdminApiService);

  readonly broadcasts = computed(() => this.api.broadcasts());

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

    this.api.sendBroadcast({
      title: this.formTitle().trim(),
      body: this.formBody().trim(),
      audience: this.formAudience(),
    });

    this.formTitle.set('');
    this.formBody.set('');
    this.formAudience.set('all');
    this.formError.set(null);
    this.formSuccess.set('Broadcast sent.');
  }

  statusTone(s: string): 'default' | 'warning' | 'success' {
    switch (s) {
      case 'sent':      return 'success';
      case 'draft':     return 'warning';
      default:          return 'default';
    }
  }
}
