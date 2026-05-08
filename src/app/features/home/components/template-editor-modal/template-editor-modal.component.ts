import {
  Component, Input, Output, EventEmitter, OnInit,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaskTemplate, TaskTemplateForm } from '../../../../core/models/task-template.model';

const ICON_OPTIONS = [
  'shopping_cart', 'people', 'trending_down', 'search',
  'public', 'storage', 'description', 'smart_toy',
  'travel_explore', 'bar_chart', 'mail', 'bookmark',
];

@Component({
  selector: 'app-template-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './template-editor-modal.component.html',
  styleUrls: ['./template-editor-modal.component.scss'],
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
export class TemplateEditorModalComponent implements OnInit {
  @Input() existingTemplate?: TaskTemplate;
  @Input() prefill?: { prompt: string; name: string };
  @Output() save  = new EventEmitter<{ id?: string; form: TaskTemplateForm }>();
  @Output() close = new EventEmitter<void>();

  iconOptions = ICON_OPTIONS;

  form = new FormGroup({
    name:             new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle:         new FormControl('', { nonNullable: true }),
    iconName:         new FormControl('smart_toy', { nonNullable: true }),
    defaultPrompt:    new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    accentColor:      new FormControl('--color-accent', { nonNullable: true }),
    status:           new FormControl<'active'|'idle'>('idle', { nonNullable: true }),
    tags:             new FormControl<string[]>([], { nonNullable: true }),
    illustrationType: new FormControl<TaskTemplate['illustrationType']>('custom', { nonNullable: true }),
  });

  get isEdit(): boolean { return !!this.existingTemplate; }
  get selectedIcon(): string { return this.form.controls.iconName.value; }

  ngOnInit(): void {
    if (this.existingTemplate) {
      const safeStatus: 'active' | 'idle' =
        this.existingTemplate.status === 'active' ? 'active' : 'idle';
      this.form.patchValue({ ...this.existingTemplate, status: safeStatus });
    } else if (this.prefill) {
      this.form.patchValue({ name: this.prefill.name, defaultPrompt: this.prefill.prompt });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }

  selectIcon(icon: string): void { this.form.controls.iconName.setValue(icon); }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.save.emit({
      id: this.existingTemplate?.id,
      form: { ...raw, status: raw.status as 'active' | 'idle' },
    });
  }
}
