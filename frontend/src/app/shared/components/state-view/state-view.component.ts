import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroInbox,
  heroExclamationTriangle,
  heroArrowPath,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-state-view',
  imports: [NgIcon],
  providers: [provideIcons({ heroInbox, heroExclamationTriangle, heroArrowPath })],
  templateUrl: './state-view.component.html',
})
export class StateViewComponent {
  readonly kind = input.required<'loading' | 'empty' | 'error'>();
  readonly title = input<string>('');
  readonly message = input<string>('');
}
