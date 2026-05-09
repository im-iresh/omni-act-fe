import {
  Component, Input, Output, EventEmitter, inject,
  ChangeDetectionStrategy, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaskService } from '../../../../core/services/task.service';
import { TaskRun } from '../../../../core/models/task-run.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-task-history-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, StatusBadgeComponent],
  templateUrl: './task-history-modal.component.html',
  styleUrls: ['./task-history-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('drawerEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('280ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in',
          style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class TaskHistoryModalComponent {
  @Input({ required: true }) taskId!: string;
  @Input({ required: true }) taskTitle!: string;

  @Output() close = new EventEmitter<void>();

  private taskService = inject(TaskService);

  runs = computed(() => this.taskService.getRunsForTask(this.taskId));

  formatDuration(run: TaskRun): string {
    if (!run.completedAt) return '—';
    const ms = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
    const s = Math.round(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
