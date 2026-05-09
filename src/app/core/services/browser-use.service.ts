import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BrowserStep, TaskExecution } from '../models/browser-step.model';
import { TaskConfiguration } from '../models/task.model';
import { environment } from '../../../environments/environment';

export abstract class BrowserUseService {
  abstract startTask(taskId: string, prompt: string, config: TaskConfiguration): Observable<BrowserStep>;
  abstract stopTask(taskId: string): void;
  abstract getExecution(taskId: string): TaskExecution | null;
  abstract fetchFiles(taskId: string): void;
}

@Injectable()
export class MockBrowserUseService extends BrowserUseService {
  private executions  = new Map<string, TaskExecution>();
  private stopSubjects = new Map<string, Subject<void>>();

  private mockSteps: Omit<BrowserStep, 'status' | 'timestamp'>[] = [
    { stepNumber: 1,  title: 'Initializing browser session',  detail: 'Chromium headless v120' },
    { stepNumber: 2,  title: 'Navigating to target URL',       detail: 'https://amazon.in' },
    { stepNumber: 3,  title: 'Waiting for page load',          detail: 'DOM ready in 1.2s' },
    { stepNumber: 4,  title: 'Locating search input',          detail: 'Selector: #twotabsearchtextbox' },
    { stepNumber: 5,  title: 'Typing search query',            detail: '"wireless earbuds under 2000"' },
    { stepNumber: 6,  title: 'Clicking search button',         detail: 'Selector: .nav-search-submit' },
    { stepNumber: 7,  title: 'Waiting for results page',       detail: 'Loaded 48 results' },
    { stepNumber: 8,  title: 'Extracting product titles',      detail: '48 items found' },
    { stepNumber: 9,  title: 'Extracting prices',              detail: '46 of 48 priced' },
    { stepNumber: 10, title: 'Extracting ratings',             detail: '44 of 48 rated' },
    { stepNumber: 11, title: 'Filtering by price constraint',  detail: '32 items under ₹2000' },
    { stepNumber: 12, title: 'Structuring results as JSON',    detail: 'Output: 32 records' },
  ];

  startTask(taskId: string, prompt: string, _config: TaskConfiguration): Observable<BrowserStep> {
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
          observer.next({
            stepNumber: 0,
            title: 'Completed',
            status: 'completed',
            resultMarkdown: `## Results\n\nFound **32 products** matching your criteria.\n\n| Product | Price | Rating |\n|---------|-------|--------|\n| boAt Airdopes 141 | ₹1,299 | 4.1★ |\n| realme Buds Q2 | ₹1,599 | 4.0★ |\n| JBL Wave 100TWS | ₹1,799 | 4.2★ |\n\n> Export complete. Full dataset available for download.`,
            hasFiles: true,
          });
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

  fetchFiles(_taskId: string): void {
    console.log('[Mock] fetchFiles called — no files in mock mode');
  }
}

interface RunStartResponse {
  status: string;
  task_id: string;
  task: string;
  websocket_url: string;
}

interface WsStepMessage {
  task_id: string;
  event: string;
  message: string;
  timestamp: string;
  step?: number;
  actions?: string[];
  thoughts?: string;
  errors?: string[];
  results?: string[];
  current_url?: string;
  screenshot?: string;
}

@Injectable()
export class RealBrowserAutomationService extends BrowserUseService {
  private http = inject(HttpClient);
  private executions = new Map<string, TaskExecution>();
  private sockets    = new Map<string, WebSocket>();

  startTask(taskId: string, prompt: string, _config: TaskConfiguration): Observable<BrowserStep> {
    return new Observable<BrowserStep>(observer => {
      this.http.post<RunStartResponse>(
        `${environment.browserApiUrl}/run`,
        { task: prompt }
      ).subscribe({
        next: (res) => {
          const wsPath = res.websocket_url.startsWith('/') ? res.websocket_url : `/${res.websocket_url}`;
          const ws = new WebSocket(`${environment.browserWsUrl}${wsPath}`);
          this.sockets.set(taskId, ws);

          ws.onmessage = (e) => {
            try {
              const msg: WsStepMessage = JSON.parse(e.data);
              const step = this.mapToStep(msg);
              if (step) observer.next(step);
            } catch { /* skip unparseable frames */ }
          };

          ws.onclose = () => {
            observer.next({ stepNumber: 0, title: 'Completed', status: 'completed', hasFiles: false });
            observer.complete();
          };

          ws.onerror = (err) => observer.error(err);
        },
        error: (err) => observer.error(err),
      });

      return () => {
        const ws = this.sockets.get(taskId);
        if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
      };
    });
  }

  private mapToStep(msg: WsStepMessage): BrowserStep | null {
    if (msg.step == null) return null;

    const errors = msg.errors ?? [];
    let timestamp: string | undefined;
    try { timestamp = new Date(msg.timestamp).toTimeString().slice(0, 8); } catch { /* ignore */ }

    const detailParts = [...(msg.actions ?? []), ...(msg.results ?? [])].filter(Boolean);
    const detail = detailParts.join(' · ').slice(0, 120) || undefined;

    const rawTitle = msg.thoughts ?? msg.message ?? `Step ${msg.step}`;
    const title = rawTitle.length > 80 ? rawTitle.slice(0, 77) + '…' : rawTitle;

    return {
      stepNumber: msg.step,
      title,
      status: errors.length > 0 ? 'error' : 'completed',
      detail,
      timestamp,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      screenshot: msg.screenshot || undefined,
      thoughts: msg.thoughts,
      currentUrl: msg.current_url,
    };
  }

  stopTask(taskId: string): void {
    const ws = this.sockets.get(taskId);
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
    const exec = this.executions.get(taskId);
    if (exec) exec.status = 'stopped';
  }

  getExecution(taskId: string): TaskExecution | null {
    return this.executions.get(taskId) ?? null;
  }

  fetchFiles(taskId: string): void {
    window.open(`${environment.browserApiUrl}/files/${taskId}`, '_blank');
  }
}
