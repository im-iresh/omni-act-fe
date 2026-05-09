import {
  Component, Input, Output, EventEmitter, OnInit,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, transition, style, animate } from '@angular/animations';
import { Task, TaskForm, TaskCategory, CATEGORY_LABELS } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './task-editor-modal.component.html',
  styleUrls: ['./task-editor-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('modalEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translate(-50%, -50%) scale(0.96) translateY(-8px)' }),
        animate('280ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease-in',
          style({ opacity: 0, transform: 'translate(-50%, -50%) scale(0.96) translateY(-8px)' }))
      ])
    ])
  ]
})
export class TaskEditorModalComponent implements OnInit {
  @Input() existingTask?: Task;

  @Output() save    = new EventEmitter<{ id?: string; form: TaskForm }>();
  @Output() run     = new EventEmitter<{ id?: string; form: TaskForm }>();
  @Output() test    = new EventEmitter<{ id?: string; form: TaskForm }>();
  @Output() publish = new EventEmitter<{ id?: string; form: TaskForm }>();
  @Output() close   = new EventEmitter<void>();

  readonly categories: { value: TaskCategory; label: string }[] = [
    { value: 'bot',            label: CATEGORY_LABELS['bot'] },
    { value: 'agent',          label: CATEGORY_LABELS['agent'] },
    { value: 'web-automation', label: CATEGORY_LABELS['web-automation'] },
    { value: 'data-scraping',  label: CATEGORY_LABELS['data-scraping'] },
    { value: 'social-media',   label: CATEGORY_LABELS['social-media'] },
    { value: 'productivity',   label: CATEGORY_LABELS['productivity'] },
  ];

  form = new FormGroup({
    title:         new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description:   new FormControl('', { nonNullable: true }),
    prompt:        new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category:      new FormControl<TaskCategory>('web-automation', { nonNullable: true }),
    schedulerType: new FormControl<'none'|'daily'|'weekly'|'custom'>('none', { nonNullable: true }),
    schedulerCron: new FormControl('', { nonNullable: true }),
    configMode:    new FormControl<'headed'|'headless'>('headless', { nonNullable: true }),
    isPublished:   new FormControl(false, { nonNullable: true }),
  });

  get isEdit(): boolean { return !!this.existingTask; }
  get isCustomSchedule(): boolean { return this.form.controls.schedulerType.value === 'custom'; }

  ngOnInit(): void {
    if (this.existingTask) {
      this.form.patchValue({
        title:         this.existingTask.title,
        description:   this.existingTask.description,
        prompt:        this.existingTask.prompt,
        category:      this.existingTask.category,
        schedulerType: this.existingTask.scheduler.type,
        schedulerCron: this.existingTask.scheduler.cron ?? '',
        configMode:    this.existingTask.configuration.mode,
        isPublished:   this.existingTask.isPublished,
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }

  private buildForm(): TaskForm {
    const v = this.form.getRawValue();
    return {
      title:         v.title,
      description:   v.description,
      prompt:        v.prompt,
      category:      v.category,
      scheduler:     { type: v.schedulerType, cron: v.schedulerType === 'custom' ? v.schedulerCron : undefined },
      configuration: { mode: v.configMode },
      status:        'idle',
      isPublished:   v.isPublished,
    };
  }

  private payload(): { id?: string; form: TaskForm } {
    return { id: this.existingTask?.id, form: this.buildForm() };
  }

  onSave():    void { if (this.form.valid) this.save.emit(this.payload()); }
  onRun():     void { if (this.form.valid) this.run.emit(this.payload()); }
  onTest():    void { if (this.form.valid) this.test.emit(this.payload()); }
  onPublish(): void {
    if (this.form.valid) {
      this.publish.emit({ ...this.payload(), form: { ...this.buildForm(), isPublished: true } });
    }
  }
}
