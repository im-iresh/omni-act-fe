import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TaskHistoryEntry } from '../../../../core/models/task-history.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  @Input({ required: true }) task!: TaskHistoryEntry;
  @Input() isHistory = false;
  @Output() view           = new EventEmitter<string>();
  @Output() stop           = new EventEmitter<string>();
  @Output() rerun          = new EventEmitter<void>();
  @Output() saveAsTemplate = new EventEmitter<void>();
  @Output() delete         = new EventEmitter<string>();

  get progressPercent(): number {
    if (!this.task.totalSteps) return 0;
    return Math.round((this.task.completedSteps / this.task.totalSteps) * 100);
  }

  get timeLabel(): string {
    if (!this.task.startedAt) return '';
    const ms = Date.now() - new Date(this.task.startedAt).getTime();
    const m  = Math.floor(ms / 60000);
    return m > 0 ? `${m}m ago` : 'just now';
  }
}
