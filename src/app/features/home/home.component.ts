import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { TemplateCardComponent } from './components/template-card/template-card.component';
import { TaskCardComponent } from './components/task-card/task-card.component';
import { NewTaskModalComponent } from './components/new-task-modal/new-task-modal.component';
import { TemplateEditorModalComponent } from './components/template-editor-modal/template-editor-modal.component';
import { TaskExecutionPanelComponent } from './components/task-execution-panel/task-execution-panel.component';
import { TaskTemplateService } from '../../core/services/task-template.service';
import { TaskHistoryService } from '../../core/services/task-history.service';
import { TaskTemplate, TaskTemplateForm } from '../../core/models/task-template.model';
import { TaskHistoryEntry } from '../../core/models/task-history.model';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface ActiveExecution {
  taskId: string;
  prompt: string;
  taskName: string;
  templateId?: string;
}

export type ModalState =
  | { type: 'none' }
  | { type: 'new-task' }
  | { type: 'edit-template'; templateId: string }
  | { type: 'new-template' }
  | { type: 'save-as-template'; prefillPrompt: string; prefillName: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSnackBarModule,
    NavbarComponent,
    TemplateCardComponent,
    TaskCardComponent,
    NewTaskModalComponent,
    TemplateEditorModalComponent,
    TaskExecutionPanelComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('sectionEnter', [
      transition(':enter', [
        query('.card-slot', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, [
            animate('350ms cubic-bezier(0.4, 0, 0.2, 1)',
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class HomeComponent {
  private templateService = inject(TaskTemplateService);
  private historyService  = inject(TaskHistoryService);
  private snackBar        = inject(MatSnackBar);

  templates    = this.templateService.templates;
  activeTasks  = computed(() => this.historyService.getRunning());
  historyTasks = computed(() => this.historyService.getCompleted());

  modal           = signal<ModalState>({ type: 'none' });
  activeExecution = signal<ActiveExecution | null>(null);
  historyOpen     = signal(true);

  // ── Modal triggers ────────────────────────────────────────────────────────
  openNewTask():     void { this.modal.set({ type: 'new-task' }); }
  openNewTemplate(): void { this.modal.set({ type: 'new-template' }); }
  closeModal():      void { this.modal.set({ type: 'none' }); }

  openEditTemplate(templateId: string): void {
    this.modal.set({ type: 'edit-template', templateId });
  }

  openSaveAsTemplate(entry: TaskHistoryEntry): void {
    this.modal.set({
      type: 'save-as-template',
      prefillPrompt: entry.prompt,
      prefillName: entry.name,
    });
  }

  // ── Task execution ─────────────────────────────────────────────────────────
  onRunTemplate(template: TaskTemplate): void {
    const taskId = `task-${template.id}-${Date.now()}`;
    this.historyService.add({
      id: taskId,
      name: template.name,
      prompt: template.defaultPrompt,
      status: 'running',
      startedAt: new Date().toISOString(),
      totalSteps: 12,
      completedSteps: 0,
      templateId: template.id,
    });
    this.activeExecution.set({
      taskId,
      prompt: template.defaultPrompt,
      taskName: template.name,
      templateId: template.id,
    });
    this.closeModal();
  }

  onRunCustomPrompt(prompt: string): void {
    const taskId = `task-custom-${Date.now()}`;
    this.historyService.add({
      id: taskId,
      name: 'Custom task',
      prompt,
      status: 'running',
      startedAt: new Date().toISOString(),
      totalSteps: 12,
      completedSteps: 0,
    });
    this.activeExecution.set({ taskId, prompt, taskName: 'Custom task' });
    this.closeModal();
  }

  onExecutionClose(): void {
    this.activeExecution.set(null);
  }

  onTaskStop(taskId: string): void {
    const entry = this.historyService.entries().find(e => e.id === taskId);
    if (entry) {
      this.historyService.update({
        ...entry,
        status: 'stopped',
        completedAt: new Date().toISOString(),
      });
    }
    if (this.activeExecution()?.taskId === taskId) {
      this.activeExecution.set(null);
    }
  }

  onViewTask(taskId: string): void {
    const entry = this.historyService.entries().find(e => e.id === taskId);
    if (!entry) return;
    this.activeExecution.set({ taskId, prompt: entry.prompt, taskName: entry.name });
  }

  onRerunTask(entry: TaskHistoryEntry): void {
    const taskId = `task-rerun-${Date.now()}`;
    this.historyService.add({
      ...entry,
      id: taskId,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      completedSteps: 0,
    });
    this.activeExecution.set({ taskId, prompt: entry.prompt, taskName: entry.name });
  }

  // ── Template CRUD ──────────────────────────────────────────────────────────
  onSaveTemplate(payload: { id?: string; form: TaskTemplateForm }): void {
    if (payload.id) {
      this.templateService.update(payload.id, payload.form);
    } else {
      this.templateService.create(payload.form);
    }
    this.closeModal();
  }

  onDeleteTemplate(id: string):    void { this.templateService.delete(id); }
  onDuplicateTemplate(id: string): void { this.templateService.duplicate(id); }
  onDeleteHistory(id: string):     void { this.historyService.delete(id); }
  toggleHistory():                 void { this.historyOpen.update(v => !v); }

  showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: ['snack-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  // ── Computed helpers for modal inputs ─────────────────────────────────────
  get modalTemplate(): TaskTemplate | undefined {
    const m = this.modal();
    return m.type === 'edit-template'
      ? this.templateService.getById(m.templateId)
      : undefined;
  }

  get modalPrefill(): { prompt: string; name: string } | undefined {
    const m = this.modal();
    return m.type === 'save-as-template'
      ? { prompt: m.prefillPrompt, name: m.prefillName }
      : undefined;
  }
}
