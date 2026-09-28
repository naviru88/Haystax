import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiService } from '../services/admin-api.service';

@Component({
  selector: 'app-admin-moderation',
  imports: [DatePipe],
  templateUrl: './moderation.component.html',
})
export class ModerationComponent {
  private readonly api = inject(AdminApiService);
  readonly actions = computed(() => this.api.moderationActions());

  actionTone(t: string): 'default' | 'warning' | 'danger' | 'success' {
    switch (t) {
      case 'warning':
      case 'unpublish_listing':
        return 'warning';
      case 'remove_listing':
      case 'restrict_owner':
        return 'danger';
      case 'restore_listing':
        return 'success';
      default:
        return 'default';
    }
  }
}
