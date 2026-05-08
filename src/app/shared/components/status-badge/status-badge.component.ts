import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStatus } from '../../../core/models/task-template.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + status" role="status" [attr.aria-label]="status + ' status'">
      <span class="badge__dot" [class.badge__dot--pulse]="status === 'running' || status === 'active'"></span>
      <span class="badge__label">{{ label }}</span>
    </span>
  `,
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status: TaskStatus = 'idle';

  get label(): string {
    const map: Record<TaskStatus, string> = {
      active: 'Active', idle: 'Idle', running: 'Running', error: 'Error'
    };
    return map[this.status];
  }
}
