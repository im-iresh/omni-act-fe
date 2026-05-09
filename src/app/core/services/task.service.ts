import { Injectable, signal, computed, inject } from '@angular/core';
import { Task, TaskForm } from '../models/task.model';
import { TaskRun } from '../models/task-run.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private storage = inject(StorageService);

  tasks    = signal<Task[]>(this.storage.getTasks());
  taskRuns = signal<TaskRun[]>(this.storage.getTaskRuns());

  getPublished = computed(() => this.tasks().filter(t => t.isPublished));

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  create(form: TaskForm): Task {
    const now = new Date().toISOString();
    const task: Task = {
      ...form,
      id: `task-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.saveTask(task);
    this.tasks.update(all => [...all, task]);
    return task;
  }

  update(id: string, form: TaskForm): void {
    const now = new Date().toISOString();
    this.tasks.update(all => all.map(t =>
      t.id === id ? { ...t, ...form, id, updatedAt: now } : t
    ));
    const updated = this.tasks().find(t => t.id === id);
    if (updated) this.storage.saveTask(updated);
  }

  delete(id: string): void {
    this.storage.deleteTask(id);
    this.tasks.update(all => all.filter(t => t.id !== id));
    this.taskRuns.update(all => all.filter(r => r.taskId !== id));
  }

  publish(id: string): void {
    this.tasks.update(all => all.map(t =>
      t.id === id ? { ...t, isPublished: true, updatedAt: new Date().toISOString() } : t
    ));
    const task = this.tasks().find(t => t.id === id);
    if (task) this.storage.saveTask(task);
  }

  unpublish(id: string): void {
    this.tasks.update(all => all.map(t =>
      t.id === id ? { ...t, isPublished: false, updatedAt: new Date().toISOString() } : t
    ));
    const task = this.tasks().find(t => t.id === id);
    if (task) this.storage.saveTask(task);
  }

  setStatus(id: string, status: Task['status']): void {
    this.tasks.update(all => all.map(t =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    ));
    const task = this.tasks().find(t => t.id === id);
    if (task) this.storage.saveTask(task);
  }

  getById(id: string): Task | undefined {
    return this.tasks().find(t => t.id === id);
  }

  // ── Task Runs ──────────────────────────────────────────────────────────────

  addRun(run: TaskRun): void {
    this.storage.saveTaskRun(run);
    this.taskRuns.update(all => [run, ...all]);
  }

  updateRun(run: TaskRun): void {
    this.storage.saveTaskRun(run);
    this.taskRuns.update(all => all.map(r => r.id === run.id ? run : r));
  }

  getRunsForTask(taskId: string): TaskRun[] {
    return this.taskRuns().filter(r => r.taskId === taskId);
  }

  getRunById(id: string): TaskRun | undefined {
    return this.taskRuns().find(r => r.id === id);
  }
}
