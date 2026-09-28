import { Component, input, output, signal } from '@angular/core';
import { ModerationActionType } from '../../models/moderation-action.model';

interface ActionOption {
  value: ModerationActionType;
  label: string;
  tone: 'default' | 'warning' | 'danger';
}

@Component({
  selector: 'app-moderation-modal',
  templateUrl: './moderation-modal.component.html',
})
export class ModerationModalComponent {
  readonly open = input.required<boolean>();
  readonly reportTitle = input.required<string>();

  readonly close = output<void>();
  readonly submit = output<{ actionType: ModerationActionType; reason: string }>();

  readonly actionType = signal<ModerationActionType>('warning');
  readonly reason = signal<string>('');
  readonly error = signal<string | null>(null);

  readonly options: ActionOption[] = [
    { value: 'warning',          label: 'Warn owner',         tone: 'warning' },
    { value: 'unpublish_listing', label: 'Unpublish listing',  tone: 'warning' },
    { value: 'remove_listing',   label: 'Remove listing',     tone: 'danger'  },
    { value: 'restrict_owner',   label: 'Restrict owner',     tone: 'danger'  },
    { value: 'dismiss_report',   label: 'Dismiss report',     tone: 'default' },
  ];

  setAction(v: ModerationActionType): void {
    this.actionType.set(v);
    this.error.set(null);
  }

  setReason(v: string): void {
    this.reason.set(v);
    this.error.set(null);
  }

  onCancel(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.reason().trim().length === 0) {
      this.error.set('A reason is required for the audit log.');
      return;
    }
    this.submit.emit({ actionType: this.actionType(), reason: this.reason().trim() });
  }
}
