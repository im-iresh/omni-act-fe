import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Task, CATEGORY_LABELS } from '../../../../core/models/task.model';

@Component({
  selector: 'app-store-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './store-card.component.html',
  styleUrls: ['./store-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreCardComponent {
  @Input({ required: true }) task!: Task;

  @Output() run       = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();

  get categoryLabel(): string {
    return CATEGORY_LABELS[this.task.category] ?? this.task.category;
  }

  get categoryClass(): string {
    const map: Record<string, string> = {
      'bot':            'cat--purple',
      'agent':          'cat--accent',
      'web-automation': 'cat--cyan',
      'data-scraping':  'cat--amber',
      'social-media':   'cat--green',
      'productivity':   'cat--blue',
    };
    return map[this.task.category] ?? 'cat--accent';
  }
}
