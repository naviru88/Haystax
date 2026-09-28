import { Component, input } from '@angular/core';

export type StatTone = 'default' | 'warning' | 'danger' | 'success' | 'primary';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly tone = input<StatTone>('default');
  readonly hint = input<string | undefined>(undefined);
}
