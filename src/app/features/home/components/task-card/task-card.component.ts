import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Task, CATEGORY_LABELS } from '../../../../core/models/task.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, StatusBadgeComponent],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;

  @Output() run     = new EventEmitter<void>();
  @Output() stop    = new EventEmitter<void>();
  @Output() edit    = new EventEmitter<void>();
  @Output() history = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() delete  = new EventEmitter<void>();

  get categoryLabel(): string {
    return CATEGORY_LABELS[this.task.category] ?? this.task.category;
  }

  get isRunning(): boolean { return this.task.status === 'running'; }
}
