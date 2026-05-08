import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskTemplate } from '../../../../core/models/task-template.model';

@Component({
  selector: 'app-template-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './template-card.component.html',
  styleUrls: ['./template-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateCardComponent {
  @Input({ required: true }) template!: TaskTemplate;
  @Output() run       = new EventEmitter<TaskTemplate>();
  @Output() edit      = new EventEmitter<string>();
  @Output() duplicate = new EventEmitter<string>();
  @Output() delete    = new EventEmitter<string>();
}
