import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { TaskCardComponent } from './components/task-card/task-card.component';
import { TaskEditorModalComponent } from './components/task-editor-modal/task-editor-modal.component';
import { TaskHistoryModalComponent } from './components/task-history-modal/task-history-modal.component';
import { TaskExecutionPanelComponent } from './components/task-execution-panel/task-execution-panel.component';
import { TaskService } from '../../core/services/task.service';
import { Task, TaskForm } from '../../core/models/task.model';
import { TaskRun } from '../../core/models/task-run.model';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface ActiveExecution {
  taskId: string;
  runId: string;
  prompt: string;
  taskName: string;
  configuration: Task['configuration'];
  isTest: boolean;
}

export type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; taskId: string }
  | { type: 'history'; taskId: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSnackBarModule,
    NavbarComponent,
    TaskCardComponent,
    TaskEditorModalComponent,
    TaskHistoryModalComponent,
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
  private taskService = inject(TaskService);
  private snackBar    = inject(MatSnackBar);

  tasks = this.taskService.tasks;

  modal           = signal<ModalState>({ type: 'none' });
  activeExecution = signal<ActiveExecution | null>(null);

  // ── Modal triggers ────────────────────────────────────────────────────────
  onCreateTask(): void { this.modal.set({ type: 'create' }); }
  closeModal():   void { this.modal.set({ type: 'none' }); }

  onEditTask(taskId: string): void {
    this.modal.set({ type: 'edit', taskId });
  }

  onShowHistory(taskId: string): void {
    this.modal.set({ type: 'history', taskId });
  }

  // ── Task CRUD ─────────────────────────────────────────────────────────────
  onSaveTask(payload: { id?: string; form: TaskForm }): void {
    if (payload.id) {
      this.taskService.update(payload.id, payload.form);
    } else {
      this.taskService.create(payload.form);
    }
    this.closeModal();
  }

  onDeleteTask(taskId: string): void {
    this.taskService.delete(taskId);
  }

  onPublish(taskId: string): void {
    const task = this.taskService.getById(taskId);
    if (!task) return;
    if (task.isPublished) {
      this.taskService.unpublish(taskId);
    } else {
      this.taskService.publish(taskId);
      this.snackBar.open('Task published to Store', 'Dismiss', {
        duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom',
      });
    }
  }

  // ── Task execution ────────────────────────────────────────────────────────
  private startExecution(task: Task, isTest = false): void {
    const runId = `run-${task.id}-${Date.now()}`;
    const run: TaskRun = {
      id: runId, taskId: task.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      totalSteps: 12, completedSteps: 0, hasFiles: false,
    };
    this.taskService.addRun(run);
    this.taskService.setStatus(task.id, 'running');
    this.activeExecution.set({
      taskId: task.id, runId,
      prompt: task.prompt,
      taskName: task.title,
      configuration: task.configuration,
      isTest,
    });
  }

  onRunTask(taskId: string): void {
    const task = this.taskService.getById(taskId);
    if (!task) return;
    this.closeModal();
    this.startExecution(task, false);
  }

  onTestTask(taskId: string): void {
    const task = this.taskService.getById(taskId);
    if (!task) return;
    this.startExecution(task, true);
  }

  onSaveAndRun(payload: { id?: string; form: TaskForm }): void {
    let task: Task;
    if (payload.id) {
      this.taskService.update(payload.id, payload.form);
      task = this.taskService.getById(payload.id)!;
    } else {
      task = this.taskService.create(payload.form);
    }
    this.closeModal();
    this.startExecution(task, false);
  }

  onSaveAndTest(payload: { id?: string; form: TaskForm }): void {
    let task: Task;
    if (payload.id) {
      this.taskService.update(payload.id, payload.form);
      task = this.taskService.getById(payload.id)!;
    } else {
      task = this.taskService.create(payload.form);
    }
    this.startExecution(task, true);
  }

  onSaveAndPublish(payload: { id?: string; form: TaskForm }): void {
    const form: TaskForm = { ...payload.form, isPublished: true };
    if (payload.id) {
      this.taskService.update(payload.id, form);
    } else {
      this.taskService.create(form);
    }
    this.closeModal();
    this.snackBar.open('Task published to Store', 'Dismiss', {
      duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom',
    });
  }

  onStopTask(taskId: string): void {
    this.taskService.setStatus(taskId, 'idle');
    const exec = this.activeExecution();
    if (exec?.taskId === taskId) {
      const run = this.taskService.getRunById(exec.runId);
      if (run) {
        this.taskService.updateRun({
          ...run, status: 'stopped', completedAt: new Date().toISOString()
        });
      }
      if (!exec.isTest) this.activeExecution.set(null);
    }
  }

  onExecutionClose(): void {
    const exec = this.activeExecution();
    if (exec) {
      this.taskService.setStatus(exec.taskId, 'idle');
      const run = this.taskService.getRunById(exec.runId);
      if (run && run.status === 'running') {
        this.taskService.updateRun({
          ...run, status: 'stopped', completedAt: new Date().toISOString()
        });
      }
    }
    this.activeExecution.set(null);
  }

  onExecutionComplete(result: { runId: string; taskId: string; resultMarkdown?: string; hasFiles: boolean; completedSteps: number }): void {
    this.taskService.setStatus(result.taskId, 'idle');
    const run = this.taskService.getRunById(result.runId);
    if (run) {
      this.taskService.updateRun({
        ...run,
        status: 'completed',
        completedAt: new Date().toISOString(),
        resultMarkdown: result.resultMarkdown,
        hasFiles: result.hasFiles,
        completedSteps: result.completedSteps,
        totalSteps: result.completedSteps,
      });
    }
  }

  // ── Computed helpers ──────────────────────────────────────────────────────
  get editTask(): Task | undefined {
    const m = this.modal();
    return m.type === 'edit' ? this.taskService.getById(m.taskId) : undefined;
  }

  get historyTaskId(): string | undefined {
    const m = this.modal();
    return m.type === 'history' ? m.taskId : undefined;
  }

  get historyTaskTitle(): string {
    const m = this.modal();
    if (m.type !== 'history') return '';
    return this.taskService.getById(m.taskId)?.title ?? '';
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: ['snack-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
