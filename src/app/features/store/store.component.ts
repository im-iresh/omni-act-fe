import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { StoreCardComponent } from './components/store-card/store-card.component';
import { TaskExecutionPanelComponent } from '../home/components/task-execution-panel/task-execution-panel.component';
import { TaskService } from '../../core/services/task.service';
import { Task, TaskForm } from '../../core/models/task.model';
import { TaskRun } from '../../core/models/task-run.model';
import { ExecutionCompleteEvent } from '../home/components/task-execution-panel/task-execution-panel.component';

interface StoreExecution {
  taskId: string;
  runId: string;
  prompt: string;
  taskName: string;
  configuration: Task['configuration'];
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [
    CommonModule, MatIconModule,
    NavbarComponent, StoreCardComponent, TaskExecutionPanelComponent
  ],
  templateUrl: './store.component.html',
  styleUrls: ['./store.component.scss'],
  animations: [
    trigger('gridEnter', [
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
export class StoreComponent {
  private taskService = inject(TaskService);

  publishedTasks = computed(() => this.taskService.tasks().filter(t => t.isPublished));
  activeExecution = signal<StoreExecution | null>(null);

  onRunFromStore(task: Task): void {
    const copy = this.taskService.create(this.copyForm(task));
    const runId = `run-${copy.id}-${Date.now()}`;
    const run: TaskRun = {
      id: runId, taskId: copy.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      totalSteps: 12, completedSteps: 0, hasFiles: false,
    };
    this.taskService.addRun(run);
    this.taskService.setStatus(copy.id, 'running');
    this.activeExecution.set({
      taskId: copy.id, runId,
      prompt: copy.prompt,
      taskName: copy.title,
      configuration: copy.configuration,
    });
  }

  onDuplicate(task: Task): void {
    this.taskService.create(this.copyForm(task));
  }

  onExecutionClose(): void {
    const exec = this.activeExecution();
    if (exec) this.taskService.setStatus(exec.taskId, 'idle');
    this.activeExecution.set(null);
  }

  onExecutionComplete(event: ExecutionCompleteEvent): void {
    this.taskService.setStatus(event.taskId, 'idle');
    const run = this.taskService.getRunById(event.runId);
    if (run) {
      this.taskService.updateRun({
        ...run, status: 'completed',
        completedAt: new Date().toISOString(),
        resultMarkdown: event.resultMarkdown,
        hasFiles: event.hasFiles,
      });
    }
  }

  private copyForm(task: Task): TaskForm {
    return {
      title: task.title + ' (copy)',
      description: task.description,
      prompt: task.prompt,
      category: task.category,
      scheduler: task.scheduler,
      configuration: task.configuration,
      status: 'idle',
      isPublished: false,
    };
  }
}
