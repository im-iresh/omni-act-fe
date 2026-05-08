# Phase 2 — Core: Models, Services & Shared Components

> **Claude Code instruction**: Run this phase after `01-scaffold.md` is complete and verified.
> Create every file listed. Do not skip any. Confirm each file compiles before moving on.

---

## 2.1 Models — `src/app/core/models/`

### `task-template.model.ts`
```typescript
export type TaskStatus = 'active' | 'idle' | 'running' | 'error';

export interface TaskTemplate {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;          // Material Symbol name e.g. 'shopping_cart'
  accentColor: string;       // CSS variable name e.g. '--color-accent'
  defaultPrompt: string;
  status: TaskStatus;
  tags: string[];            // e.g. ['ecommerce', 'scraping']
  illustrationType: 'product-compare' | 'social-orbit' | 'browser-scrape' | 'custom';
  createdAt: string;         // ISO date string
  updatedAt: string;         // ISO date string
}

// Partial used for create/edit forms — id and timestamps are assigned by StorageService
export type TaskTemplateForm = Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>;
```

### `task-history.model.ts`
```typescript
export type TaskHistoryStatus = 'running' | 'completed' | 'stopped' | 'error';

export interface TaskHistoryEntry {
  id: string;                // unique task run id e.g. 'task-amazon-scout-1748330291'
  name: string;              // display name e.g. 'Amazon scrape'
  prompt: string;            // exact prompt used
  status: TaskHistoryStatus;
  startedAt: string;         // ISO date string
  completedAt?: string;      // ISO date string, set on completion
  resultSummary?: string;    // e.g. '47 profiles extracted'
  totalSteps: number;
  completedSteps: number;
  templateId?: string;       // set if run originated from a template
}
```

### `intent-result.model.ts`
```typescript
export interface IntentResult {
  raw: string;               // full accumulated streamed text
  target?: string;           // e.g. "Amazon.in"
  action?: string;           // e.g. "Scrape product listings"
  query?: string;            // e.g. "wireless earbuds under 2000"
  outputFormat?: string;     // e.g. "Structured JSON"
  confidence?: number;       // 0-1 float
}

export interface IntentChunk {
  token: string;             // single character or small chunk from SSE
  done: boolean;
}
```

### `browser-step.model.ts`
```typescript
export type StepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface BrowserStep {
  stepNumber: number;
  title: string;
  status: StepStatus;
  detail?: string;           // sub-line: URL navigated to, action detail
  timestamp?: string;        // HH:MM:SS
  errorMessage?: string;
  durationMs?: number;
}

export interface TaskExecution {
  taskId: string;
  prompt: string;
  totalSteps: number;
  completedSteps: number;
  elapsedSeconds: number;
  status: 'intent' | 'executing' | 'completed' | 'stopped' | 'error';
  steps: BrowserStep[];
}
```

---

## 2.2 DI Tokens — `src/app/core/tokens/service.tokens.ts`

```typescript
import { InjectionToken } from '@angular/core';
import { IntentStreamService } from '../services/intent-stream.service';
import { BrowserUseService } from '../services/browser-use.service';

export const INTENT_STREAM_SERVICE =
  new InjectionToken<IntentStreamService>('INTENT_STREAM_SERVICE');

export const BROWSER_USE_SERVICE =
  new InjectionToken<BrowserUseService>('BROWSER_USE_SERVICE');
```

---

## 2.3 Service Interfaces — `src/app/core/services/`

### `intent-stream.service.ts` (abstract base + mock)

```typescript
import { Injectable } from '@angular/core';
import { Observable, Subject, interval, of } from 'rxjs';
import { map, take, finalize } from 'rxjs/operators';
import { IntentChunk } from '../models/intent-result.model';

// ── Abstract interface ────────────────────────────────────────────────────────
export abstract class IntentStreamService {
  abstract streamIntent(prompt: string): Observable<IntentChunk>;
  abstract cancelStream(): void;
}

// ── Mock implementation ───────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class MockIntentStreamService extends IntentStreamService {
  private cancelSubject = new Subject<void>();

  streamIntent(prompt: string): Observable<IntentChunk> {
    const mockResponse =
      `Analyzing your request: "${prompt}"\n\n` +
      `I understand you want to perform automated web browsing. ` +
      `Target platform identified. ` +
      `Extracting structured task parameters — navigating to the relevant page, ` +
      `collecting data matching your criteria, and formatting results for export.`;

    const chars = mockResponse.split('');
    return new Observable<IntentChunk>(observer => {
      let index = 0;
      const intervalId = setInterval(() => {
        if (index < chars.length) {
          observer.next({ token: chars[index], done: false });
          index++;
        } else {
          observer.next({ token: '', done: true });
          observer.complete();
          clearInterval(intervalId);
        }
      }, 18);

      return () => clearInterval(intervalId);
    });
  }

  cancelStream(): void {
    this.cancelSubject.next();
  }
}
```

### `browser-use.service.ts` (abstract base + mock)

```typescript
import { Injectable } from '@angular/core';
import { Observable, interval, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
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
    { stepNumber: 1,  title: 'Initializing browser session',       detail: 'Chromium headless v120' },
    { stepNumber: 2,  title: 'Navigating to target URL',            detail: 'https://amazon.in' },
    { stepNumber: 3,  title: 'Waiting for page load',               detail: 'DOM ready in 1.2s' },
    { stepNumber: 4,  title: 'Locating search input',               detail: 'Selector: #twotabsearchtextbox' },
    { stepNumber: 5,  title: 'Typing search query',                 detail: '"wireless earbuds under 2000"' },
    { stepNumber: 6,  title: 'Clicking search button',              detail: 'Selector: .nav-search-submit' },
    { stepNumber: 7,  title: 'Waiting for results page',            detail: 'Loaded 48 results' },
    { stepNumber: 8,  title: 'Extracting product titles',           detail: '48 items found' },
    { stepNumber: 9,  title: 'Extracting prices',                   detail: '46 of 48 priced' },
    { stepNumber: 10, title: 'Extracting ratings',                  detail: '44 of 48 rated' },
    { stepNumber: 11, title: 'Filtering by price constraint',       detail: '32 items under ₹2000' },
    { stepNumber: 12, title: 'Structuring results as JSON',         detail: 'Output: 32 records' },
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
```

### `storage.service.ts`

> Central localStorage adapter. All reads/writes for templates and history go through this service. No direct `localStorage` calls anywhere else.

```typescript
import { Injectable } from '@angular/core';
import { TaskTemplate } from '../models/task-template.model';
import { TaskHistoryEntry } from '../models/task-history.model';

const KEYS = {
  TEMPLATES: 'omniact_templates',
  HISTORY:   'omniact_history',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {

  // ── Templates ──────────────────────────────────────────────────────────────

  getTemplates(): TaskTemplate[] {
    try {
      const raw = localStorage.getItem(KEYS.TEMPLATES);
      return raw ? (JSON.parse(raw) as TaskTemplate[]) : this.seedTemplates();
    } catch {
      return this.seedTemplates();
    }
  }

  saveTemplate(template: TaskTemplate): void {
    const all = this.getTemplates();
    const idx = all.findIndex(t => t.id === template.id);
    if (idx >= 0) { all[idx] = template; } else { all.push(template); }
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(all));
  }

  deleteTemplate(id: string): void {
    const filtered = this.getTemplates().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(filtered));
  }

  duplicateTemplate(id: string): TaskTemplate | null {
    const original = this.getTemplates().find(t => t.id === id);
    if (!original) return null;
    const copy: TaskTemplate = {
      ...original,
      id: `tpl-${Date.now()}`,
      name: `${original.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveTemplate(copy);
    return copy;
  }

  // ── History ────────────────────────────────────────────────────────────────

  getHistory(): TaskHistoryEntry[] {
    try {
      const raw = localStorage.getItem(KEYS.HISTORY);
      return raw ? (JSON.parse(raw) as TaskHistoryEntry[]) : [];
    } catch {
      return [];
    }
  }

  saveHistoryEntry(entry: TaskHistoryEntry): void {
    const all = this.getHistory();
    const idx = all.findIndex(h => h.id === entry.id);
    if (idx >= 0) { all[idx] = entry; } else { all.unshift(entry); } // newest first
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(all));
  }

  deleteHistoryEntry(id: string): void {
    const filtered = this.getHistory().filter(h => h.id !== id);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  exportTemplatesAsJson(): void {
    const data = JSON.stringify(this.getTemplates(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniact_templates_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importTemplatesFromJson(jsonString: string): void {
    const imported = JSON.parse(jsonString) as TaskTemplate[];
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(imported));
  }

  // ── Seed data ──────────────────────────────────────────────────────────────

  private seedTemplates(): TaskTemplate[] {
    const now = new Date().toISOString();
    const seeds: TaskTemplate[] = [
      {
        id: 'tpl-amazon-scout',
        name: 'Amazon Scout',
        subtitle: 'Product data miner',
        iconName: 'shopping_cart',
        accentColor: '--color-accent',
        defaultPrompt: 'Scrape top 50 wireless earbuds under ₹2000 from Amazon.in with prices, ratings, and reviews. Export as JSON.',
        status: 'active',
        tags: ['ecommerce', 'scraping'],
        illustrationType: 'browser-scrape',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-linkedin-harvester',
        name: 'LinkedIn Harvester',
        subtitle: 'Profile & lead extractor',
        iconName: 'people',
        accentColor: '--color-purple',
        defaultPrompt: 'Find all software engineers in Bangalore with 3-5 years experience on LinkedIn and export their profiles.',
        status: 'idle',
        tags: ['social', 'lead-gen'],
        illustrationType: 'social-orbit',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-price-tracker',
        name: 'Price Tracker',
        subtitle: 'E-commerce monitor',
        iconName: 'trending_down',
        accentColor: '--color-idle',
        defaultPrompt: 'Monitor the price of iPhone 15 128GB on Flipkart daily and alert when it drops below ₹55,000.',
        status: 'idle',
        tags: ['ecommerce', 'monitoring'],
        illustrationType: 'custom',
        createdAt: now,
        updatedAt: now,
      },
    ];
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(seeds));
    return seeds;
  }
}
```

### `task-history.service.ts`

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { TaskHistoryEntry } from '../models/task-history.model';

@Injectable({ providedIn: 'root' })
export class TaskHistoryService {
  private storage = inject(StorageService);

  // Reactive signal — components subscribe to this directly
  entries = signal<TaskHistoryEntry[]>(this.storage.getHistory());

  add(entry: TaskHistoryEntry): void {
    this.storage.saveHistoryEntry(entry);
    this.entries.set(this.storage.getHistory());
  }

  update(updated: TaskHistoryEntry): void {
    this.storage.saveHistoryEntry(updated);
    this.entries.set(this.storage.getHistory());
  }

  delete(id: string): void {
    this.storage.deleteHistoryEntry(id);
    this.entries.set(this.storage.getHistory());
  }

  getRunning(): TaskHistoryEntry[] {
    return this.entries().filter(e => e.status === 'running');
  }

  getCompleted(): TaskHistoryEntry[] {
    return this.entries().filter(e => e.status === 'completed' || e.status === 'stopped' || e.status === 'error');
  }

  historyToTemplate(entry: TaskHistoryEntry): Omit<TaskHistoryEntry, 'id'> & { suggestedName: string } {
    return { ...entry, suggestedName: entry.name };
  }
}
```

### `task-template.service.ts`

```typescript
import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { TaskTemplate, TaskTemplateForm } from '../models/task-template.model';

@Injectable({ providedIn: 'root' })
export class TaskTemplateService {
  private storage = inject(StorageService);

  // Reactive signal — components subscribe to this directly
  templates = signal<TaskTemplate[]>(this.storage.getTemplates());

  create(form: TaskTemplateForm): TaskTemplate {
    const now = new Date().toISOString();
    const tpl: TaskTemplate = {
      ...form,
      id: `tpl-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.saveTemplate(tpl);
    this.templates.set(this.storage.getTemplates());
    return tpl;
  }

  update(id: string, form: TaskTemplateForm): void {
    const existing = this.templates().find(t => t.id === id);
    if (!existing) return;
    const updated: TaskTemplate = {
      ...existing,
      ...form,
      updatedAt: new Date().toISOString(),
    };
    this.storage.saveTemplate(updated);
    this.templates.set(this.storage.getTemplates());
  }

  delete(id: string): void {
    this.storage.deleteTemplate(id);
    this.templates.set(this.storage.getTemplates());
  }

  duplicate(id: string): void {
    this.storage.duplicateTemplate(id);
    this.templates.set(this.storage.getTemplates());
  }

  getById(id: string): TaskTemplate | undefined {
    return this.templates().find(t => t.id === id);
  }

  exportJson(): void {
    this.storage.exportTemplatesAsJson();
  }
}
```

---

## 2.4 Shared Components

### `TypewriterComponent` — `src/app/shared/components/typewriter/`

**`typewriter.component.ts`**
```typescript
import {
  Component, Input, Output, EventEmitter,
  OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-typewriter',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="typewriter-text">{{ displayText() }}<span
      class="cursor"
      [class.cursor--hidden]="isComplete()"
    >▋</span></span>
  `,
  styleUrls: ['./typewriter.component.scss']
})
export class TypewriterComponent implements OnChanges, OnDestroy {
  @Input() fullText = '';
  @Input() speed = 18;            // ms per character
  @Input() active = false;        // set true to start
  @Output() complete = new EventEmitter<void>();

  displayText = signal('');
  isComplete = signal(false);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private charIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fullText'] && this.fullText) {
      this.reset();
      if (this.active) this.start();
    }
    if (changes['active']?.currentValue === true) {
      this.start();
    }
  }

  appendToken(token: string): void {
    this.displayText.update(t => t + token);
  }

  markComplete(): void {
    this.isComplete.set(true);
    this.complete.emit();
  }

  private start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      if (this.charIndex < this.fullText.length) {
        this.displayText.update(t => t + this.fullText[this.charIndex]);
        this.charIndex++;
      } else {
        this.stop();
        this.isComplete.set(true);
        this.complete.emit();
      }
    }, this.speed);
  }

  private stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private reset(): void {
    this.stop();
    this.charIndex = 0;
    this.displayText.set('');
    this.isComplete.set(false);
  }

  ngOnDestroy(): void { this.stop(); }
}
```

**`typewriter.component.scss`**
```scss
.typewriter-text {
  font-family: var(--font-body);
  color: var(--color-accent);
  font-style: italic;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  color: var(--color-accent);
  animation: blink-cursor 0.8s step-end infinite;
  margin-left: 1px;

  &--hidden { display: none; }
}
```

---

### `StatusBadgeComponent` — `src/app/shared/components/status-badge/`

**`status-badge.component.ts`**
```typescript
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStatus } from '../../../core/models/task-template.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge--' + status" role="status" [attr.aria-label]="status + ' status'">
      <span class="badge__dot" [class.badge__dot--pulse]="status === 'running' || status === 'active'"></span>
      <span class="badge__label">{{ label }}</span>
    </span>
  `,
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status: TaskStatus = 'idle';

  get label(): string {
    const map: Record<TaskStatus, string> = {
      active: 'Active', idle: 'Idle', running: 'Running', error: 'Error'
    };
    return map[this.status];
  }
}
```

**`status-badge.component.scss`**
```scss
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-body);
  letter-spacing: 0.03em;

  &--active  { background: var(--color-active-dim);  color: var(--color-active);  border: 1px solid rgba(34, 197, 94, 0.2); }
  &--idle    { background: var(--color-idle-dim);    color: var(--color-idle);    border: 1px solid rgba(234, 179, 8, 0.2); }
  &--running { background: var(--color-accent-dim);  color: var(--color-accent);  border: 1px solid rgba(0, 212, 255, 0.2); }
  &--error   { background: var(--color-error-dim);   color: var(--color-error);   border: 1px solid rgba(239, 68, 68, 0.2); }
}

.badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  &--pulse { animation: pulse-dot 1.5s ease-in-out infinite; }
}

.badge__label { line-height: 1; }
```

---

### `NavbarComponent` — `src/app/shared/components/navbar/`

**`navbar.component.ts`**
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  navLinks = [
    { label: 'Explore Tasks', active: true },
    { label: 'My Workflows',  active: false },
    { label: 'History',       active: false },
    { label: 'Pricing',       active: false },
  ];
}
```

**`navbar.component.html`**
```html
<nav class="navbar" role="navigation" aria-label="Main navigation">
  <!-- Logo -->
  <div class="navbar__logo" aria-label="OmniAct home">
    <div class="navbar__logo-icon">
      <mat-icon>auto_awesome</mat-icon>
    </div>
    <span class="navbar__logo-text">OmniAct</span>
  </div>

  <!-- Nav Links -->
  <ul class="navbar__links" role="list">
    @for (link of navLinks; track link.label) {
      <li>
        <button
          class="navbar__link"
          [class.navbar__link--active]="link.active"
          [attr.aria-current]="link.active ? 'page' : null"
        >{{ link.label }}</button>
      </li>
    }
  </ul>

  <!-- Right Side -->
  <div class="navbar__right">
    <div class="navbar__search" role="search">
      <mat-icon class="navbar__search-icon" aria-hidden="true">search</mat-icon>
      <input
        class="navbar__search-input"
        type="search"
        placeholder="Search tasks..."
        aria-label="Search tasks"
      />
    </div>
    <button class="navbar__avatar" aria-label="User profile" mat-icon-button>
      <mat-icon>account_circle</mat-icon>
    </button>
  </div>
</nav>
```

**`navbar.component.scss`**
```scss
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 32px;
  height: 64px;
  background: rgba(5, 10, 21, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border);

  &__logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  &__logo-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--color-accent), var(--color-purple));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--glow-accent);

    mat-icon { color: #050a15; font-size: 20px; width: 20px; height: 20px; }
  }

  &__logo-text {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 4px;
    list-style: none;
    flex: 1;
  }

  &__link {
    padding: 6px 16px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 20px;
    cursor: pointer;
    transition: color var(--transition-fast), background var(--transition-fast);

    &:hover { color: var(--color-text); background: var(--color-surface); }

    &--active {
      color: var(--color-text);
      background: var(--color-surface-hover);
      border: 1px solid var(--color-border-strong);
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    transition: border-color var(--transition-fast);

    &:focus-within {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 1px var(--color-accent-dim);
    }
  }

  &__search-icon { color: var(--color-muted); font-size: 18px; width: 18px; height: 18px; }

  &__search-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 0.875rem;
    width: 180px;

    &::placeholder { color: var(--color-muted); }
  }

  &__avatar {
    color: var(--color-text-secondary) !important;
    &:hover { color: var(--color-accent) !important; }
  }
}
```

---

## 2.5 Verification Checklist

Before proceeding to Phase 3, confirm:
- [ ] All model files compile with no TypeScript errors
- [ ] `StorageService.getTemplates()` returns the 3 seeded templates on first run
- [ ] Editing and re-loading the page persists changes in `localStorage` under `omniact_templates`
- [ ] `TaskTemplateService.create()`, `update()`, `delete()`, `duplicate()` all reflect immediately in the `templates` signal
- [ ] `TaskHistoryService.getRunning()` and `getCompleted()` correctly partition entries by status
- [ ] Both mock streaming services instantiate without errors (`ng build --configuration development`)
- [ ] `TypewriterComponent` renders correctly in isolation
- [ ] `StatusBadgeComponent` shows correct color for each status
- [ ] `NavbarComponent` renders without layout breakage
