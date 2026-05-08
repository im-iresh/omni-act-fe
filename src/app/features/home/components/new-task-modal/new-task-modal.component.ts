import {
  Component, Input, Output, EventEmitter,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaskTemplate } from '../../../../core/models/task-template.model';

@Component({
  selector: 'app-new-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './new-task-modal.component.html',
  styleUrls: ['./new-task-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('modalEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.96) translateY(12px)' }),
        animate('280ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0, transform: 'scale(0.96)' }))
      ])
    ])
  ]
})
export class NewTaskModalComponent {
  @Input() templates: TaskTemplate[] = [];
  @Output() run   = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  promptControl = new FormControl('');

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }

  quickFill(template: TaskTemplate): void {
    this.promptControl.setValue(template.defaultPrompt);
  }

  submit(): void {
    const val = this.promptControl.value?.trim();
    if (val) { this.run.emit(val); }
  }

  onKeydownEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) { event.preventDefault(); this.submit(); }
  }
}
