import { Injectable } from '@angular/core';
import { Task, TaskCategory } from '../models/task.model';
import { TaskRun } from '../models/task-run.model';

const KEYS = {
  TASKS:     'omniact_tasks',
  TASK_RUNS: 'omniact_task_runs',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {

  // ── Tasks ──────────────────────────────────────────────────────────────────

  getTasks(): Task[] {
    try {
      const raw = localStorage.getItem(KEYS.TASKS);
      return raw ? (JSON.parse(raw) as Task[]) : this.seedTasks();
    } catch {
      return this.seedTasks();
    }
  }

  saveTask(task: Task): void {
    const all = this.getTasks();
    const idx = all.findIndex(t => t.id === task.id);
    if (idx >= 0) { all[idx] = task; } else { all.push(task); }
    localStorage.setItem(KEYS.TASKS, JSON.stringify(all));
  }

  deleteTask(id: string): void {
    const filtered = this.getTasks().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(filtered));
    this.deleteRunsForTask(id);
  }

  // ── Task Runs ──────────────────────────────────────────────────────────────

  getTaskRuns(taskId?: string): TaskRun[] {
    try {
      const raw = localStorage.getItem(KEYS.TASK_RUNS);
      const all = raw ? (JSON.parse(raw) as TaskRun[]) : [];
      return taskId ? all.filter(r => r.taskId === taskId) : all;
    } catch {
      return [];
    }
  }

  saveTaskRun(run: TaskRun): void {
    const all = this.getTaskRuns();
    const idx = all.findIndex(r => r.id === run.id);
    if (idx >= 0) { all[idx] = run; } else { all.unshift(run); }
    localStorage.setItem(KEYS.TASK_RUNS, JSON.stringify(all));
  }

  deleteTaskRun(id: string): void {
    const filtered = this.getTaskRuns().filter(r => r.id !== id);
    localStorage.setItem(KEYS.TASK_RUNS, JSON.stringify(filtered));
  }

  private deleteRunsForTask(taskId: string): void {
    const filtered = this.getTaskRuns().filter(r => r.taskId !== taskId);
    localStorage.setItem(KEYS.TASK_RUNS, JSON.stringify(filtered));
  }

  // ── Seed data ──────────────────────────────────────────────────────────────

  private seedTasks(): Task[] {
    const now = new Date().toISOString();
    const seeds: Task[] = [
      {
        id: 'task-amazon-scout',
        title: 'Amazon Scout',
        description: 'Scrapes product listings with prices, ratings, and reviews.',
        prompt: 'Scrape top 50 wireless earbuds under ₹2000 from Amazon.in with prices, ratings, and reviews. Export as JSON.',
        category: 'data-scraping' as TaskCategory,
        scheduler: { type: 'none' },
        configuration: { mode: 'headless' },
        status: 'idle',
        isPublished: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-linkedin-harvester',
        title: 'LinkedIn Harvester',
        description: 'Extracts profiles and lead data from LinkedIn searches.',
        prompt: 'Find all software engineers in Bangalore with 3-5 years experience on LinkedIn and export their profiles.',
        category: 'social-media' as TaskCategory,
        scheduler: { type: 'none' },
        configuration: { mode: 'headed' },
        status: 'idle',
        isPublished: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task-price-tracker',
        title: 'Price Tracker',
        description: 'Monitors e-commerce prices and alerts on drops.',
        prompt: 'Monitor the price of iPhone 15 128GB on Flipkart daily and alert when it drops below ₹55,000.',
        category: 'web-automation' as TaskCategory,
        scheduler: { type: 'daily' },
        configuration: { mode: 'headless' },
        status: 'idle',
        isPublished: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    localStorage.setItem(KEYS.TASKS, JSON.stringify(seeds));
    return seeds;
  }
}
