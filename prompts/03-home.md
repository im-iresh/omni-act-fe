# Phase 3 — Home Page, Sections, Cards & Modals

> **Claude Code instruction**: Run this phase after `02-core.md` is verified.
> This phase replaces the single tile-row approach entirely.
> Delete any previously generated files under `add-task-tile/` — that component
> no longer exists. It is replaced by `NewTaskModalComponent`.

---

## Overview of what this phase builds

The home page has three sections stacked vertically, each with a horizontal card row:

1. **Templates section** — one card per saved template + a dashed "New template" card
2. **Active tasks section** — running task cards + "New task" button in the header
3. **History section** — collapsible, shows completed / stopped / errored tasks

Two dark-themed centered modals:
- **NewTaskModalComponent** — opened by "New task" button; has prompt textarea + quick-fill chips
- **TemplateEditorModalComponent** — opened by Edit / New template / "Save as template"; full CRUD form

---

## 3.1 Folder structure changes

Remove `add-task-tile/` if it exists from a previous iteration.
Create inside `src/app/features/home/components/`:

```
components/
├── template-card/
├── task-card/
├── new-task-modal/
└── template-editor-modal/
```

`task-execution-panel/` from Phase 4 remains unchanged.

---

## 3.2 Home Component

### `home.component.ts`

```typescript
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
    const exec = this.activeExecution();
    if (exec) {
      const entry = this.historyService.entries().find(e => e.id === exec.taskId);
      if (entry && entry.status === 'running') {
        this.historyService.update({
          ...entry,
          status: 'stopped',
          completedAt: new Date().toISOString(),
        });
      }
    }
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

  onDeleteTemplate(id: string):   void { this.templateService.delete(id); }
  onDuplicateTemplate(id: string): void { this.templateService.duplicate(id); }
  onDeleteHistory(id: string):    void { this.historyService.delete(id); }
  toggleHistory():                void { this.historyOpen.update(v => !v); }

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
```

---

### `home.component.html`

```html
<div class="home">
  <app-navbar />

  <div class="home__body">

    <!-- ── Templates ─────────────────────────────────────────────────── -->
    <section class="home__section" aria-labelledby="tpl-heading">
      <div class="home__section-header">
        <div class="home__section-title">
          <mat-icon aria-hidden="true">auto_awesome</mat-icon>
          <span id="tpl-heading">Templates</span>
          <span class="home__count">{{ templates().length }}</span>
        </div>
        <button class="home__section-action" (click)="openNewTemplate()" aria-label="New template">
          <mat-icon>add</mat-icon> New template
        </button>
      </div>

      <div class="home__card-row" role="list" @sectionEnter>
        @for (tpl of templates(); track tpl.id) {
          <div class="card-slot" role="listitem">
            <app-template-card
              [template]="tpl"
              (run)="onRunTemplate($event)"
              (edit)="openEditTemplate($event)"
              (duplicate)="onDuplicateTemplate($event)"
              (delete)="onDeleteTemplate($event)"
            />
          </div>
        }
        <div class="card-slot" role="listitem">
          <button class="home__add-card" (click)="openNewTemplate()" aria-label="Create new template">
            <div class="home__add-card-icon"><mat-icon>add</mat-icon></div>
            <span class="home__add-card-label">New template</span>
            <span class="home__add-card-hint">Save a reusable prompt</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ── Active tasks ──────────────────────────────────────────────── -->
    <section class="home__section" aria-labelledby="tasks-heading">
      <div class="home__section-header">
        <div class="home__section-title">
          <mat-icon aria-hidden="true">bolt</mat-icon>
          <span id="tasks-heading">Active tasks</span>
          <span class="home__count">{{ activeTasks().length }}</span>
        </div>
        <button class="home__new-task-btn" (click)="openNewTask()" aria-label="Create a new task">
          <mat-icon>add</mat-icon> New task
        </button>
      </div>

      @if (activeTasks().length === 0) {
        <div class="home__empty-state">
          <mat-icon>pending_actions</mat-icon>
          <span>No active tasks — click <strong>New task</strong> to get started</span>
        </div>
      } @else {
        <div class="home__card-row" role="list">
          @for (task of activeTasks(); track task.id) {
            <div class="card-slot" role="listitem">
              <app-task-card
                [task]="task"
                (view)="onViewTask($event)"
                (stop)="onTaskStop($event)"
                (saveAsTemplate)="openSaveAsTemplate(task)"
              />
            </div>
          }
        </div>
      }
    </section>

    <!-- ── History (collapsible) ──────────────────────────────────────── -->
    <section class="home__section" aria-labelledby="hist-heading">
      <button
        class="home__history-toggle"
        (click)="toggleHistory()"
        [attr.aria-expanded]="historyOpen()"
        aria-controls="history-body"
      >
        <div class="home__section-title">
          <mat-icon aria-hidden="true">history</mat-icon>
          <span id="hist-heading">History</span>
          <span class="home__count">{{ historyTasks().length }}</span>
        </div>
        <mat-icon class="home__chevron" [class.home__chevron--open]="historyOpen()">
          expand_more
        </mat-icon>
      </button>

      @if (historyOpen()) {
        <div id="history-body" class="home__card-row" role="list">
          @if (historyTasks().length === 0) {
            <div class="home__empty-state">
              <mat-icon>inbox</mat-icon>
              <span>No completed tasks yet</span>
            </div>
          }
          @for (task of historyTasks(); track task.id) {
            <div class="card-slot" role="listitem">
              <app-task-card
                [task]="task"
                [isHistory]="true"
                (view)="onViewTask($event)"
                (rerun)="onRerunTask(task)"
                (saveAsTemplate)="openSaveAsTemplate(task)"
                (delete)="onDeleteHistory($event)"
              />
            </div>
          }
        </div>
      }
    </section>

  </div>

  <!-- ── Modals ─────────────────────────────────────────────────────────── -->
  @if (modal().type === 'new-task') {
    <app-new-task-modal
      [templates]="templates()"
      (run)="onRunCustomPrompt($event)"
      (close)="closeModal()"
    />
  }

  @if (modal().type === 'edit-template' || modal().type === 'new-template' || modal().type === 'save-as-template') {
    <app-template-editor-modal
      [existingTemplate]="modalTemplate"
      [prefill]="modalPrefill"
      (save)="onSaveTemplate($event)"
      (close)="closeModal()"
    />
  }

  <!-- ── Execution panel ────────────────────────────────────────────────── -->
  @if (activeExecution()) {
    <app-task-execution-panel
      [taskId]="activeExecution()!.taskId"
      [prompt]="activeExecution()!.prompt"
      [taskName]="activeExecution()!.taskName"
      (close)="onExecutionClose()"
    />
  }

  <div class="home__star" aria-hidden="true">✦</div>
</div>
```

---

### `home.component.scss`

```scss
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.home__body {
  padding: 20px 24px 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

// ── Section chrome ─────────────────────────────────────────────────────────────
.home__section { display: flex; flex-direction: column; }

.home__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.home__section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-muted);

  mat-icon { font-size: 14px; width: 14px; height: 14px; }
}

.home__count {
  font-size: 0.62rem;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 9px;
  padding: 1px 7px;
}

.home__section-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  padding: 0;
  mat-icon { font-size: 14px; width: 14px; height: 14px; }
  &:hover { opacity: 0.75; }
}

.home__new-task-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: var(--color-accent-dim);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-size: 0.72rem;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  mat-icon { font-size: 15px; width: 15px; height: 15px; }
  &:hover { background: rgba(0, 212, 255, 0.18); border-color: rgba(0, 212, 255, 0.35); }
}

// ── Card rows ──────────────────────────────────────────────────────────────────
.home__card-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
}

.card-slot { flex-shrink: 0; }

// ── Add-template dashed card ───────────────────────────────────────────────────
.home__add-card {
  width: 200px;
  min-height: 260px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  cursor: pointer;
  font-family: var(--font-body);
  transition: border-color var(--transition-fast);
  &:hover { border-color: rgba(0, 212, 255, 0.22); }
}

.home__add-card-icon {
  width: 40px; height: 40px;
  border-radius: 11px;
  background: var(--color-accent-dim);
  border: 1px solid rgba(0, 212, 255, 0.16);
  display: flex; align-items: center; justify-content: center;
  mat-icon { color: var(--color-accent); font-size: 20px; width: 20px; height: 20px; }
}

.home__add-card-label { font-size: 0.78rem; font-weight: 500; color: var(--color-text-secondary); }
.home__add-card-hint  { font-size: 0.65rem; color: var(--color-muted); text-align: center; padding: 0 16px; }

// ── History toggle ─────────────────────────────────────────────────────────────
.home__history-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 0;
  margin-bottom: 10px;
}

.home__chevron {
  color: var(--color-muted);
  font-size: 18px;
  width: 18px;
  height: 18px;
  transition: transform var(--transition-fast);
  transform: rotate(-90deg);

  &--open { transform: rotate(0deg); }
}

// ── Empty state ────────────────────────────────────────────────────────────────
.home__empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 4px;
  font-size: 0.78rem;
  color: var(--color-muted);
  mat-icon { font-size: 20px; width: 20px; height: 20px; opacity: 0.35; }
  strong { color: var(--color-accent); font-weight: 500; }
}

// ── Decorative star ────────────────────────────────────────────────────────────
.home__star {
  position: fixed;
  bottom: 22px; right: 22px;
  font-size: 20px;
  color: var(--color-accent);
  opacity: 0.32;
  pointer-events: none;
  animation: star-rotate 14s linear infinite;
}
```

---

## 3.3 TemplateCardComponent — `components/template-card/`

### `template-card.component.ts`

```typescript
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskTemplate } from '../../../../core/models/task-template.model';

@Component({
  selector: 'app-template-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './template-card.component.html',
  styleUrls: ['./template-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateCardComponent {
  @Input({ required: true }) template!: TaskTemplate;
  @Output() run       = new EventEmitter<TaskTemplate>();
  @Output() edit      = new EventEmitter<string>();
  @Output() duplicate = new EventEmitter<string>();
  @Output() delete    = new EventEmitter<string>();
}
```

### `template-card.component.html`

```html
<article class="tcard" [attr.aria-label]="template.name + ' template'">
  <header class="tcard__header">
    <div class="tcard__icon">
      <mat-icon aria-hidden="true">{{ template.iconName }}</mat-icon>
    </div>
    <div class="tcard__titles">
      <h3 class="tcard__name">{{ template.name }}</h3>
      <p class="tcard__sub">{{ template.subtitle }}</p>
    </div>
    <span class="tcard__badge">Template</span>
  </header>

  <div class="tcard__illus" aria-hidden="true">
    @switch (template.illustrationType) {
      @case ('browser-scrape') {
        <div class="illus-browser">
          <div class="illus-panel">
            <div class="illus-row r90"></div><div class="illus-row r65"></div><div class="illus-row r40"></div>
          </div>
          <span class="illus-arrow">→</span>
          <div class="illus-panel illus-panel--accent">
            <div class="illus-row r90 ac"></div><div class="illus-row r65 ac"></div><div class="illus-row r40 ac"></div>
          </div>
        </div>
      }
      @case ('social-orbit') {
        <div class="illus-orbit">
          <div class="illus-orbit__ring"></div>
          <div class="illus-orbit__center"><mat-icon>hub</mat-icon></div>
          <div class="illus-orbit__dot illus-orbit__dot--1"><mat-icon>person</mat-icon></div>
          <div class="illus-orbit__dot illus-orbit__dot--2"><mat-icon>work</mat-icon></div>
          <div class="illus-orbit__dot illus-orbit__dot--3"><mat-icon>mail</mat-icon></div>
        </div>
      }
      @default {
        <div class="illus-default"><mat-icon>auto_awesome</mat-icon></div>
      }
    }
  </div>

  <div class="tcard__prompt-preview">
    <span class="tcard__prompt-text">{{ template.defaultPrompt }}</span>
  </div>

  <footer class="tcard__footer">
    <button mat-button class="btn-ghost" (click)="edit.emit(template.id)" aria-label="Edit {{ template.name }}">
      <mat-icon>edit</mat-icon> Edit
    </button>
    <button mat-raised-button class="btn-primary" (click)="run.emit(template)" aria-label="Run {{ template.name }}">
      <mat-icon>play_arrow</mat-icon> Run
    </button>
  </footer>

  <div class="tcard__actions" role="group" aria-label="More actions for {{ template.name }}">
    <button class="tcard__action-btn" (click)="duplicate.emit(template.id)" aria-label="Duplicate">
      <mat-icon>content_copy</mat-icon> Duplicate
    </button>
    <button class="tcard__action-btn tcard__action-btn--danger" (click)="delete.emit(template.id)" aria-label="Delete">
      <mat-icon>delete_outline</mat-icon> Delete
    </button>
  </div>
</article>
```

### `template-card.component.scss`

```scss
.tcard {
  width: 200px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color var(--transition-fast), transform var(--transition-fast);

  &:hover { border-color: rgba(0, 212, 255, 0.2); transform: translateY(-2px); }
}

.tcard__header {
  display: flex; align-items: center; gap: 9px;
  padding: 12px 12px 9px;
}

.tcard__icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: var(--color-accent-dim);
  border: 1px solid rgba(0, 212, 255, 0.12);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  mat-icon { color: var(--color-accent); font-size: 16px; width: 16px; height: 16px; }
}

.tcard__titles { flex: 1; min-width: 0; }
.tcard__name { font-size: 0.78rem; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tcard__sub  { font-size: 0.65rem; color: var(--color-muted); margin-top: 1px; }

.tcard__badge {
  flex-shrink: 0; font-size: 0.6rem; font-weight: 500;
  padding: 2px 7px; border-radius: 9px;
  background: var(--color-purple-dim); color: #a78bfa;
  border: 1px solid rgba(124, 58, 237, 0.15);
}

.tcard__illus {
  margin: 0 10px; height: 88px; border-radius: var(--radius-md);
  background: rgba(0,0,0,0.25); border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}

.illus-browser { display: flex; align-items: center; gap: 5px; padding: 8px; width: 100%; }

.illus-panel {
  flex: 1; background: rgba(255,255,255,0.025); border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.05); padding: 6px;
  display: flex; flex-direction: column; gap: 3px;
  &--accent { background: var(--color-accent-dim); border-color: rgba(0,212,255,0.12); }
}

.illus-row {
  height: 3px; border-radius: 2px; background: rgba(255,255,255,0.07);
  &.ac { background: rgba(0,212,255,0.3); }
  &.r90 { width: 90%; } &.r65 { width: 65%; } &.r40 { width: 40%; }
}

.illus-arrow { font-size: 12px; color: var(--color-accent); flex-shrink: 0; }

.illus-orbit {
  position: relative; width: 80px; height: 80px;

  &__ring { position: absolute; inset: 0; border-radius: 50%; border: 1px dashed rgba(167,139,250,0.2); }

  &__center {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--color-purple-dim); border: 1px solid rgba(124,58,237,0.2);
    display: flex; align-items: center; justify-content: center;
    mat-icon { color: #a78bfa; font-size: 14px; width: 14px; height: 14px; }
  }

  &__dot {
    position: absolute; width: 20px; height: 20px; border-radius: 50%;
    background: var(--color-surface); border: 1px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    mat-icon { color: var(--color-muted); font-size: 10px; width: 10px; height: 10px; }
    &--1 { top: -10px; left: 50%; transform: translateX(-50%); }
    &--2 { bottom: -10px; left: 50%; transform: translateX(-50%); }
    &--3 { top: 50%; right: -10px; transform: translateY(-50%); }
  }
}

.illus-default { mat-icon { color: var(--color-muted); font-size: 28px; opacity: 0.3; } }

.tcard__prompt-preview { padding: 7px 12px; flex: 1; }
.tcard__prompt-text {
  font-size: 0.65rem; color: var(--color-muted); font-family: var(--font-mono);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.5;
}

.tcard__footer {
  display: flex; gap: 6px; padding: 8px 10px;
  border-top: 1px solid var(--color-border);
  button { flex: 1; font-size: 0.72rem !important; }
  mat-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; }
}

.tcard__actions { display: flex; gap: 4px; padding: 5px 10px 8px; }

.tcard__action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 3px;
  padding: 3px 5px; background: rgba(255,255,255,0.02);
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  color: var(--color-muted); font-size: 0.62rem; font-family: var(--font-body); cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  mat-icon { font-size: 12px; width: 12px; height: 12px; }
  &:hover { color: var(--color-text-secondary); border-color: rgba(255,255,255,0.14); }
  &--danger:hover { color: var(--color-error); border-color: rgba(239,68,68,0.25); }
}
```

---

## 3.4 TaskCardComponent — `components/task-card/`

### `task-card.component.ts`

```typescript
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TaskHistoryEntry } from '../../../../core/models/task-history.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  @Input({ required: true }) task!: TaskHistoryEntry;
  @Input() isHistory = false;
  @Output() view           = new EventEmitter<string>();
  @Output() stop           = new EventEmitter<string>();
  @Output() rerun          = new EventEmitter<void>();
  @Output() saveAsTemplate = new EventEmitter<void>();
  @Output() delete         = new EventEmitter<string>();

  get progressPercent(): number {
    if (!this.task.totalSteps) return 0;
    return Math.round((this.task.completedSteps / this.task.totalSteps) * 100);
  }

  get timeLabel(): string {
    if (!this.task.startedAt) return '';
    const ms = Date.now() - new Date(this.task.startedAt).getTime();
    const m  = Math.floor(ms / 60000);
    return m > 0 ? `${m}m ago` : 'just now';
  }
}
```

### `task-card.component.html`

```html
<article
  class="tkcard"
  [class.tkcard--running]="task.status === 'running'"
  [class.tkcard--history]="isHistory"
  [attr.aria-label]="task.name + ' — ' + task.status"
>
  <header class="tkcard__header">
    <div class="tkcard__icon" [class.tkcard__icon--done]="isHistory">
      <mat-icon aria-hidden="true">
        {{ task.status === 'running' ? 'radio_button_checked' : 'check_circle' }}
      </mat-icon>
    </div>
    <div class="tkcard__titles">
      <h3 class="tkcard__name">{{ task.name }}</h3>
      <p class="tkcard__sub">{{ isHistory ? task.status : timeLabel }}</p>
    </div>
    <span
      class="tkcard__badge"
      [class.tkcard__badge--running]="task.status === 'running'"
      [class.tkcard__badge--done]="task.status === 'completed'"
      [class.tkcard__badge--stopped]="task.status === 'stopped' || task.status === 'error'"
      role="status"
    >
      <span class="tkcard__badge-dot"></span>
      {{ task.status === 'running' ? 'Running' : task.status === 'completed' ? 'Done' : 'Stopped' }}
    </span>
  </header>

  <div class="tkcard__body">
    <p class="tkcard__prompt">{{ task.prompt }}</p>
  </div>

  <div class="tkcard__step-preview">
    @if (task.status === 'running') {
      <span class="tkcard__step-line tkcard__step-line--running">
        Step {{ task.completedSteps }} / {{ task.totalSteps }} running...
      </span>
    } @else if (task.resultSummary) {
      <span class="tkcard__step-line tkcard__step-line--done">{{ task.resultSummary }}</span>
    } @else {
      <span class="tkcard__step-line">{{ task.completedSteps }} / {{ task.totalSteps }} steps</span>
    }
    <div class="tkcard__progress">
      <div
        class="tkcard__progress-fill"
        [style.width.%]="progressPercent"
        [class.tkcard__progress-fill--done]="task.status !== 'running'"
      ></div>
    </div>
  </div>

  <footer class="tkcard__footer">
    @if (task.status === 'running') {
      <button mat-button class="btn-ghost" (click)="view.emit(task.id)" aria-label="View execution">
        <mat-icon>visibility</mat-icon> View
      </button>
      <button mat-button class="btn-ghost tkcard__stop-btn" (click)="stop.emit(task.id)" aria-label="Stop task">
        <mat-icon>stop</mat-icon> Stop
      </button>
    } @else {
      <button mat-button class="btn-ghost" (click)="view.emit(task.id)" aria-label="View results">
        <mat-icon>visibility</mat-icon> Results
      </button>
      <button mat-button class="btn-ghost" (click)="rerun.emit()" aria-label="Re-run task">
        <mat-icon>replay</mat-icon> Re-run
      </button>
    }
  </footer>

  <div class="tkcard__actions" role="group" aria-label="More actions">
    <button class="tkcard__action-btn tkcard__action-btn--convert" (click)="saveAsTemplate.emit()" aria-label="Save as template">
      <mat-icon>bookmark_add</mat-icon> Save as template
    </button>
    @if (isHistory) {
      <button class="tkcard__action-btn tkcard__action-btn--danger" (click)="delete.emit(task.id)" aria-label="Delete">
        <mat-icon>delete_outline</mat-icon> Delete
      </button>
    }
  </div>
</article>
```

### `task-card.component.scss`

```scss
.tkcard {
  width: 200px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  display: flex; flex-direction: column; overflow: hidden;
  transition: border-color var(--transition-fast);
  &--running { border-color: rgba(0,212,255,0.18); }
  &--history { opacity: 0.72; &:hover { opacity: 1; } }
}

.tkcard__header { display: flex; align-items: center; gap: 9px; padding: 12px 12px 9px; }

.tkcard__icon {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  background: var(--color-accent-dim); border: 1px solid rgba(0,212,255,0.12);
  display: flex; align-items: center; justify-content: center;
  mat-icon { color: var(--color-accent); font-size: 16px; width: 16px; height: 16px; }
  &--done {
    background: var(--color-active-dim); border-color: rgba(34,197,94,0.12);
    mat-icon { color: var(--color-active); }
  }
}

.tkcard__titles { flex: 1; min-width: 0; }
.tkcard__name { font-size: 0.78rem; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tkcard__sub  { font-size: 0.65rem; color: var(--color-muted); margin-top: 1px; text-transform: capitalize; }

.tkcard__badge {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px;
  font-size: 0.6rem; font-weight: 500; padding: 2px 7px; border-radius: 9px;
  &--running { background: var(--color-accent-dim);  color: var(--color-accent);  border: 1px solid rgba(0,212,255,0.15); }
  &--done    { background: var(--color-active-dim);  color: var(--color-active);  border: 1px solid rgba(34,197,94,0.15); }
  &--stopped { background: rgba(100,116,139,0.08); color: #64748b; border: 1px solid rgba(100,116,139,0.12); }
}

.tkcard__badge-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }

.tkcard__body { padding: 4px 12px 8px; flex: 1; }
.tkcard__prompt {
  font-size: 0.68rem; color: var(--color-text-secondary); line-height: 1.55;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}

.tkcard__step-preview {
  padding: 6px 12px 8px; background: rgba(0,0,0,0.18);
  border-top: 1px solid var(--color-border);
}

.tkcard__step-line {
  font-size: 0.65rem; font-family: var(--font-mono); display: block;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;
  color: var(--color-muted);
  &--running { color: var(--color-accent); }
  &--done    { color: var(--color-active); }
}

.tkcard__progress { height: 2px; background: rgba(255,255,255,0.04); border-radius: 1px; }
.tkcard__progress-fill {
  height: 100%; background: var(--color-accent); border-radius: 1px;
  transition: width 0.4s ease;
  &--done { background: var(--color-active); }
}

.tkcard__footer {
  display: flex; gap: 6px; padding: 8px 10px;
  border-top: 1px solid var(--color-border);
  button { flex: 1; font-size: 0.72rem !important; }
  mat-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; }
}

.tkcard__stop-btn { color: var(--color-error) !important; border-color: rgba(239,68,68,0.18) !important; }

.tkcard__actions { display: flex; gap: 4px; padding: 5px 10px 8px; }

.tkcard__action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 3px;
  padding: 3px 5px; background: rgba(255,255,255,0.02);
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  color: var(--color-muted); font-size: 0.62rem; font-family: var(--font-body); cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  mat-icon { font-size: 12px; width: 12px; height: 12px; }
  &--convert:hover { color: #a78bfa; border-color: rgba(124,58,237,0.25); }
  &--danger:hover  { color: var(--color-error); border-color: rgba(239,68,68,0.25); }
}
```

---

## 3.5 NewTaskModalComponent — `components/new-task-modal/`

### `new-task-modal.component.ts`

```typescript
import {
  Component, Input, Output, EventEmitter,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaskTemplate } from '../../../../core/models/task-template.model';

@Component({
  selector: 'app-new-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './new-task-modal.component.html',
  styleUrls: ['./new-task-modal.component.scss'],
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
export class NewTaskModalComponent {
  @Input() templates: TaskTemplate[] = [];
  @Output() run   = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  promptControl = new FormControl('');

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }

  quickFill(template: TaskTemplate): void {
    this.promptControl.setValue(template.defaultPrompt);
  }

  submit(): void {
    const val = this.promptControl.value?.trim();
    if (val) { this.run.emit(val); }
  }

  onKeydownEnter(event: KeyboardEvent): void {
    if (!event.shiftKey) { event.preventDefault(); this.submit(); }
  }
}
```

### `new-task-modal.component.html`

```html
<div class="modal-overlay" (click)="close.emit()" aria-hidden="true"></div>

<div class="modal" [@modalEnter] role="dialog" aria-labelledby="nt-title" aria-modal="true">
  <header class="modal__header">
    <div class="modal__header-icon modal__header-icon--cyan">
      <mat-icon>terminal</mat-icon>
    </div>
    <div>
      <h2 class="modal__title" id="nt-title">New task</h2>
      <p class="modal__subtitle">Describe what you want OmniAct to do</p>
    </div>
    <button class="modal__close" (click)="close.emit()" aria-label="Close">
      <mat-icon>close</mat-icon>
    </button>
  </header>

  <div class="modal__body">
    <div class="modal__field">
      <label class="modal__label" for="nt-prompt">
        <mat-icon>chat</mat-icon> Prompt
      </label>
      <textarea
        id="nt-prompt"
        class="modal__textarea"
        [formControl]="promptControl"
        rows="5"
        placeholder="e.g. Scrape top 20 laptops under ₹50,000 from Flipkart with specs and prices..."
        (keydown.enter)="onKeydownEnter($event)"
        aria-label="Task description"
        autofocus
      ></textarea>
      <span class="modal__field-hint mono">
        Be specific — mention site, filters, and desired output format
      </span>
    </div>

    @if (templates.length > 0) {
      <div class="modal__field">
        <div class="modal__label"><mat-icon>bolt</mat-icon> Quick-fill from template</div>
        <div class="modal__chips" role="list">
          @for (tpl of templates; track tpl.id) {
            <button
              class="modal__chip"
              (click)="quickFill(tpl)"
              [attr.aria-label]="'Fill from ' + tpl.name"
              role="listitem"
            >
              <mat-icon>{{ tpl.iconName }}</mat-icon> {{ tpl.name }}
            </button>
          }
        </div>
      </div>
    }
  </div>

  <footer class="modal__footer">
    <span class="modal__footer-hint mono">↵ run · Shift+↵ newline · Esc cancel</span>
    <div class="modal__footer-actions">
      <button mat-button class="btn-ghost" (click)="close.emit()">Cancel</button>
      <button
        mat-raised-button class="btn-primary"
        (click)="submit()"
        [disabled]="!promptControl.value?.trim()"
        aria-label="Run task"
      >
        <mat-icon>play_arrow</mat-icon> Run task
      </button>
    </div>
  </footer>
</div>
```

### `new-task-modal.component.scss`

```scss
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(6, 9, 15, 0.78);
  backdrop-filter: blur(4px);
  z-index: 300; cursor: pointer;
}

.modal {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 301;
  width: min(520px, 92vw);
  background: #0b1120;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7);
}

.modal__header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.modal__header-icon {
  width: 34px; height: 34px; border-radius: var(--radius-md); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  &--cyan {
    background: var(--color-accent-dim); border: 1px solid rgba(0,212,255,0.18);
    mat-icon { color: var(--color-accent); font-size: 17px; }
  }
}

.modal__title    { font-size: 0.88rem; font-weight: 500; color: var(--color-text); }
.modal__subtitle { font-size: 0.68rem; color: var(--color-muted); margin-top: 2px; }

.modal__close {
  margin-left: auto; width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: transparent; border: 1px solid var(--color-border);
  color: var(--color-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color var(--transition-fast), color var(--transition-fast);
  mat-icon { font-size: 15px; }
  &:hover { border-color: rgba(255,255,255,0.15); color: var(--color-text-secondary); }
}

.modal__body {
  padding: 16px 18px; display: flex; flex-direction: column; gap: 14px;
}

.modal__field { display: flex; flex-direction: column; gap: 6px; }

.modal__label {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--color-muted);
  mat-icon { font-size: 13px; width: 13px; height: 13px; color: var(--color-accent); }
}

.modal__textarea {
  width: 100%; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.09); border-radius: var(--radius-md);
  color: var(--color-text); font-family: var(--font-body); font-size: 0.82rem;
  padding: 10px 12px; resize: none; outline: none;
  caret-color: var(--color-accent); line-height: 1.6;
  transition: border-color var(--transition-fast);
  &::placeholder { color: var(--color-muted); }
  &:focus { border-color: rgba(0,212,255,0.3); }
}

.modal__field-hint { font-size: 0.65rem; color: var(--color-muted); }

.modal__chips { display: flex; flex-wrap: wrap; gap: 6px; }

.modal__chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; background: var(--color-accent-dim);
  border: 1px solid rgba(0,212,255,0.15); border-radius: 10px;
  color: var(--color-accent); font-size: 0.7rem; font-family: var(--font-body); cursor: pointer;
  transition: background var(--transition-fast);
  mat-icon { font-size: 12px; width: 12px; height: 12px; }
  &:hover { background: rgba(0,212,255,0.18); }
}

.modal__footer {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.07);
}

.modal__footer-hint { font-size: 0.62rem; color: var(--color-muted); }
.modal__footer-actions { display: flex; gap: 8px; }
```

---

## 3.6 TemplateEditorModalComponent — `components/template-editor-modal/`

### `template-editor-modal.component.ts`

```typescript
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
      this.form.patchValue(this.existingTemplate);
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
```

### `template-editor-modal.component.html`

```html
<div class="modal-overlay" (click)="close.emit()" aria-hidden="true"></div>

<div class="modal" [@modalEnter] role="dialog" aria-labelledby="te-title" aria-modal="true">
  <header class="modal__header">
    <div class="modal__header-icon modal__header-icon--purple">
      <mat-icon>auto_awesome</mat-icon>
    </div>
    <div>
      <h2 class="modal__title" id="te-title">{{ isEdit ? 'Edit template' : 'New template' }}</h2>
      <p class="modal__subtitle">Saved to localStorage · omniact_templates</p>
    </div>
    <button class="modal__close" (click)="close.emit()" aria-label="Close">
      <mat-icon>close</mat-icon>
    </button>
  </header>

  <div class="modal__body">
    <div class="modal__row">
      <div class="modal__field modal__field--half">
        <label class="modal__label" for="te-name">
          <mat-icon>text_fields</mat-icon> Name
        </label>
        <input id="te-name" class="modal__input" type="text"
          [formControl]="form.controls.name" placeholder="e.g. Amazon Scout" />
      </div>
      <div class="modal__field modal__field--half">
        <label class="modal__label" for="te-sub">
          <mat-icon>label</mat-icon> Subtitle
        </label>
        <input id="te-sub" class="modal__input" type="text"
          [formControl]="form.controls.subtitle" placeholder="Short description" />
      </div>
    </div>

    <div class="modal__field">
      <div class="modal__label"><mat-icon>grid_view</mat-icon> Icon</div>
      <div class="modal__icon-grid" role="group" aria-label="Choose icon">
        @for (icon of iconOptions; track icon) {
          <button
            type="button"
            class="modal__icon-opt"
            [class.modal__icon-opt--selected]="selectedIcon === icon"
            (click)="selectIcon(icon)"
            [attr.aria-label]="icon"
            [attr.aria-pressed]="selectedIcon === icon"
          >
            <mat-icon>{{ icon }}</mat-icon>
          </button>
        }
      </div>
    </div>

    <div class="modal__field">
      <label class="modal__label" for="te-prompt">
        <mat-icon>chat</mat-icon> Default prompt
      </label>
      <textarea
        id="te-prompt"
        class="modal__textarea"
        [formControl]="form.controls.defaultPrompt"
        rows="4"
        placeholder="Describe the task in natural language..."
      ></textarea>
    </div>

    <div class="modal__storage-note" role="note">
      <mat-icon>storage</mat-icon>
      <span>
        Stored in <code>localStorage</code> under <code>omniact_templates</code>.
        Use export / import to back up as a JSON file.
      </span>
    </div>
  </div>

  <footer class="modal__footer">
    <span class="modal__footer-hint">
      <mat-icon>save</mat-icon> Auto-saved on close
    </span>
    <div class="modal__footer-actions">
      <button mat-button class="btn-ghost" (click)="close.emit()">Cancel</button>
      <button
        mat-raised-button
        class="btn-primary btn-primary--purple"
        (click)="submit()"
        [disabled]="form.invalid"
        aria-label="{{ isEdit ? 'Save template' : 'Create template' }}"
      >
        <mat-icon>check</mat-icon>
        {{ isEdit ? 'Save template' : 'Create template' }}
      </button>
    </div>
  </footer>
</div>
```

### `template-editor-modal.component.scss`

```scss
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(6, 9, 15, 0.78);
  backdrop-filter: blur(4px);
  z-index: 300; cursor: pointer;
}

.modal {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 301;
  width: min(560px, 92vw);
  background: #0b1120;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7);
}

.modal__header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
}

.modal__header-icon {
  width: 34px; height: 34px; border-radius: var(--radius-md); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  &--purple {
    background: var(--color-purple-dim); border: 1px solid rgba(124,58,237,0.18);
    mat-icon { color: #a78bfa; font-size: 17px; }
  }
}

.modal__title    { font-size: 0.88rem; font-weight: 500; color: var(--color-text); }
.modal__subtitle { font-size: 0.68rem; color: var(--color-muted); margin-top: 2px; }

.modal__close {
  margin-left: auto; width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: transparent; border: 1px solid var(--color-border);
  color: var(--color-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color var(--transition-fast), color var(--transition-fast);
  mat-icon { font-size: 15px; }
  &:hover { border-color: rgba(255,255,255,0.15); color: var(--color-text-secondary); }
}

.modal__body {
  padding: 16px 18px; display: flex; flex-direction: column; gap: 14px;
  max-height: 60vh; overflow-y: auto;
}

.modal__row { display: flex; gap: 12px; }

.modal__field {
  display: flex; flex-direction: column; gap: 6px;
  &--half { flex: 1; min-width: 0; }
}

.modal__label {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--color-muted);
  mat-icon { font-size: 13px; width: 13px; height: 13px; color: #a78bfa; }
}

.modal__input, .modal__textarea {
  width: 100%; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.09); border-radius: var(--radius-md);
  color: var(--color-text); font-family: var(--font-body); font-size: 0.82rem;
  padding: 8px 10px; outline: none; caret-color: #a78bfa;
  transition: border-color var(--transition-fast);
  &::placeholder { color: var(--color-muted); }
  &:focus { border-color: rgba(124,58,237,0.35); }
}

.modal__textarea { resize: none; line-height: 1.6; }

.modal__icon-grid { display: flex; flex-wrap: wrap; gap: 6px; }

.modal__icon-opt {
  width: 34px; height: 34px; border-radius: var(--radius-md);
  background: rgba(255,255,255,0.03); border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  mat-icon { font-size: 16px; color: var(--color-muted); }
  &:hover { background: var(--color-purple-dim); border-color: rgba(124,58,237,0.2); mat-icon { color: #a78bfa; } }
  &--selected { background: var(--color-purple-dim); border-color: rgba(124,58,237,0.35); mat-icon { color: #a78bfa; } }
}

.modal__storage-note {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 11px; background: rgba(124,58,237,0.05);
  border: 1px solid rgba(124,58,237,0.12); border-radius: var(--radius-md);
  mat-icon { font-size: 15px; color: #a78bfa; flex-shrink: 0; margin-top: 1px; }
  span { font-size: 0.7rem; color: var(--color-text-secondary); line-height: 1.5; }
  code { font-family: var(--font-mono); font-size: 0.65rem; color: #a78bfa; }
}

.modal__footer {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.07);
}

.modal__footer-hint {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.65rem; color: var(--color-muted);
  mat-icon { font-size: 13px; width: 13px; height: 13px; }
}

.modal__footer-actions { display: flex; gap: 8px; }

.btn-primary--purple {
  background: rgba(124, 58, 237, 0.85) !important;
  color: #e2e8f0 !important;
  &:hover { background: rgba(124, 58, 237, 1) !important; }
}
```

---

## 3.7 Update AppComponent

```typescript
import { Component } from '@angular/core';
import { HomeComponent } from './features/home/home.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent],
  template: `<app-home />`
})
export class AppComponent {}
```

---

## 3.8 Verification Checklist

**Layout**
- [ ] Page renders three sections: Templates, Active tasks, History
- [ ] Each section has a header with title, count badge, and right-side action
- [ ] History section collapses / expands with chevron animation
- [ ] Card rows scroll horizontally; cards do not wrap

**Templates**
- [ ] Three seeded templates appear on first load from `localStorage`
- [ ] Editing a template opens the purple `TemplateEditorModalComponent` pre-filled
- [ ] Duplicate adds a copy immediately; Delete removes it immediately
- [ ] Dashed "New template" card and header button both open the empty editor
- [ ] Save persists under `omniact_templates` in browser DevTools → Application → Local Storage

**Active tasks**
- [ ] Empty state message shows when no running tasks
- [ ] "New task" cyan button opens `NewTaskModalComponent`
- [ ] Quick-fill chips populate the textarea from the template's `defaultPrompt`
- [ ] Submitting a prompt creates a running task card in Active tasks
- [ ] Enter submits; Shift+Enter adds a newline; Escape closes

**History**
- [ ] Stopped / completed tasks appear in History, not Active tasks
- [ ] "Re-run" creates a new running task card in Active tasks
- [ ] "Save as template" opens the template editor pre-filled with the task's prompt and name
- [ ] "Delete" removes the history entry

**Modals**
- [ ] Both modals use `#0b1120` surface — zero white areas visible
- [ ] Clicking the backdrop closes the modal
- [ ] Both animate in and out smoothly
- [ ] `TemplateEditorModalComponent` uses purple accent throughout; `NewTaskModalComponent` uses cyan
- [ ] `TemplateEditorModalComponent` body scrolls if content overflows `60vh`
