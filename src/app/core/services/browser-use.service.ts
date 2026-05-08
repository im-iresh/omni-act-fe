import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BrowserStep, TaskExecution } from '../models/browser-step.model';

export abstract class BrowserUseService {
  abstract startTask(taskId: string, prompt: string): Observable<BrowserStep>;
  abstract stopTask(taskId: string): void;
  abstract getExecution(taskId: string): TaskExecution | null;
}

@Injectable({ providedIn: 'root' })
export class MockBrowserUseService extends BrowserUseService {
  private executions = new Map<string, TaskExecution>();
  private stopSubjects = new Map<string, Subject<void>>();

  private mockSteps: Omit<BrowserStep, 'status' | 'timestamp'>[] = [
    { stepNumber: 1,  title: 'Initializing browser session',      detail: 'Chromium headless v120' },
    { stepNumber: 2,  title: 'Navigating to target URL',           detail: 'https://amazon.in' },
    { stepNumber: 3,  title: 'Waiting for page load',              detail: 'DOM ready in 1.2s' },
    { stepNumber: 4,  title: 'Locating search input',              detail: 'Selector: #twotabsearchtextbox' },
    { stepNumber: 5,  title: 'Typing search query',                detail: '"wireless earbuds under 2000"' },
    { stepNumber: 6,  title: 'Clicking search button',             detail: 'Selector: .nav-search-submit' },
    { stepNumber: 7,  title: 'Waiting for results page',           detail: 'Loaded 48 results' },
    { stepNumber: 8,  title: 'Extracting product titles',          detail: '48 items found' },
    { stepNumber: 9,  title: 'Extracting prices',                  detail: '46 of 48 priced' },
    { stepNumber: 10, title: 'Extracting ratings',                 detail: '44 of 48 rated' },
    { stepNumber: 11, title: 'Filtering by price constraint',      detail: '32 items under ₹2000' },
    { stepNumber: 12, title: 'Structuring results as JSON',        detail: 'Output: 32 records' },
  ];

  startTask(taskId: string, prompt: string): Observable<BrowserStep> {
    const stop$ = new Subject<void>();
    this.stopSubjects.set(taskId, stop$);

    const execution: TaskExecution = {
      taskId, prompt,
      totalSteps: this.mockSteps.length,
      completedSteps: 0,
      elapsedSeconds: 0,
      status: 'executing',
      steps: this.mockSteps.map(s => ({ ...s, status: 'pending' }))
    };
    this.executions.set(taskId, execution);

    return new Observable<BrowserStep>(observer => {
      let index = 0;
      const emit = () => {
        if (index >= this.mockSteps.length) {
          execution.status = 'completed';
          observer.complete();
          return;
        }
        const step: BrowserStep = {
          ...this.mockSteps[index],
          status: 'running',
          timestamp: new Date().toTimeString().slice(0, 8)
        };
        observer.next(step);

        setTimeout(() => {
          step.status = 'completed';
          execution.completedSteps++;
          observer.next({ ...step });
          index++;
          setTimeout(emit, 600 + Math.random() * 400);
        }, 1200 + Math.random() * 800);
      };
      emit();
    }).pipe(takeUntil(stop$));
  }

  stopTask(taskId: string): void {
    const stop$ = this.stopSubjects.get(taskId);
    if (stop$) { stop$.next(); stop$.complete(); }
    const exec = this.executions.get(taskId);
    if (exec) exec.status = 'stopped';
  }

  getExecution(taskId: string): TaskExecution | null {
    return this.executions.get(taskId) ?? null;
  }
}
