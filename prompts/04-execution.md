# Phase 4 — Task Execution Panel

> **Claude Code instruction**: Run this phase after `03-home.md` is verified.
> This is the core interactive screen — intent streaming + browser step feed.

---

## 4.1 TaskExecutionPanelComponent

### `task-execution-panel.component.ts`

```typescript
import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  ViewChild, ElementRef, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { TypewriterComponent } from '../../../../shared/components/typewriter/typewriter.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { MockIntentStreamService } from '../../../../core/services/intent-stream.service';
import { MockBrowserUseService } from '../../../../core/services/browser-use.service';
import { BrowserStep } from '../../../../core/models/browser-step.model';
import { IntentResult } from '../../../../core/models/intent-result.model';

@Component({
  selector: 'app-task-execution-panel',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatChipsModule, MatTooltipModule,
    TypewriterComponent, StatusBadgeComponent
  ],
  templateUrl: './task-execution-panel.component.html',
  styleUrls: ['./task-execution-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('panelEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.96) translateY(16px)' }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in',
          style({ opacity: 0, transform: 'scale(0.96) translateY(8px)' }))
      ])
    ]),
    trigger('stepEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class TaskExecutionPanelComponent implements OnInit, OnDestroy {
  @Input({ required: true }) taskId!: string;
  @Input({ required: true }) prompt!: string;
  @Input() taskName = 'Task';
  @Output() close = new EventEmitter<void>();

  @ViewChild('stepFeed') stepFeedRef!: ElementRef<HTMLDivElement>;
  @ViewChild('typewriterRef') typewriterRef!: TypewriterComponent;

  private intentService = inject(MockIntentStreamService);
  private browserService = inject(MockBrowserUseService);
  private destroy$ = new Subject<void>();

  // ── State ────────────────────────────────────────────────────────────────
  intentText = signal('');
  intentComplete = signal(false);
  intentParams = signal<Partial<IntentResult>>({});

  steps = signal<BrowserStep[]>([]);
  elapsedSeconds = signal(0);
  executionStatus = signal<'intent' | 'executing' | 'completed' | 'stopped' | 'error'>('intent');

  totalSteps = signal(0);
  completedSteps = computed(() => this.steps().filter(s => s.status === 'completed').length);
  progressPercent = computed(() =>
    this.totalSteps() > 0
      ? Math.round((this.completedSteps() / this.totalSteps()) * 100)
      : 0
  );

  elapsedFormatted = computed(() => {
    const s = this.elapsedSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  private timerSub?: ReturnType<typeof setInterval>;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.startTimer();
    this.streamIntent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerSub) clearInterval(this.timerSub);
    this.intentService.cancelStream();
  }

  // ── Intent Stream ────────────────────────────────────────────────────────
  private streamIntent(): void {
    this.intentService
      .streamIntent(this.prompt)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => {
          if (!chunk.done) {
            this.intentText.update(t => t + chunk.token);
          } else {
            this.intentComplete.set(true);
            this.parseIntentParams();
            this.startExecution();
          }
        },
        error: () => this.executionStatus.set('error')
      });
  }

  private parseIntentParams(): void {
    // In real app, backend returns structured JSON.
    // Mock: derive from prompt text.
    const p = this.prompt.toLowerCase();
    this.intentParams.set({
      target: p.includes('amazon') ? 'Amazon.in'
             : p.includes('linkedin') ? 'LinkedIn.com'
             : 'Web Browser',
      action: p.includes('scrape') || p.includes('fetch') ? 'Scrape & Extract Data'
             : p.includes('search') ? 'Search & Collect'
             : 'Automated Browsing',
      query: this.prompt.length > 60 ? this.prompt.slice(0, 57) + '…' : this.prompt,
      outputFormat: 'Structured JSON'
    });
  }

  // ── Browser Execution ────────────────────────────────────────────────────
  private startExecution(): void {
    this.executionStatus.set('executing');
    this.totalSteps.set(12); // mock knows 12 steps

    this.browserService
      .startTask(this.taskId, this.prompt)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (step) => this.handleStepUpdate(step),
        complete: () => {
          this.executionStatus.set('completed');
          if (this.timerSub) clearInterval(this.timerSub);
        },
        error: () => this.executionStatus.set('error')
      });
  }

  private handleStepUpdate(step: BrowserStep): void {
    this.steps.update(current => {
      const idx = current.findIndex(s => s.stepNumber === step.stepNumber);
      if (idx >= 0) {
        const updated = [...current];
        updated[idx] = step;
        return updated;
      }
      return [...current, step];
    });

    // Auto-scroll to bottom after DOM update
    setTimeout(() => this.scrollFeedToBottom(), 50);
  }

  private scrollFeedToBottom(): void {
    if (this.stepFeedRef?.nativeElement) {
      this.stepFeedRef.nativeElement.scrollTop =
        this.stepFeedRef.nativeElement.scrollHeight;
    }
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  private startTimer(): void {
    this.timerSub = setInterval(() => {
      this.elapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  // ── Stop ─────────────────────────────────────────────────────────────────
  stopExecution(): void {
    this.browserService.stopTask(this.taskId);
    this.intentService.cancelStream();
    this.executionStatus.set('stopped');
    if (this.timerSub) clearInterval(this.timerSub);
  }

  onClose(): void {
    this.stopExecution();
    this.close.emit();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  getStepIcon(step: BrowserStep): string {
    switch (step.status) {
      case 'completed': return 'check_circle';
      case 'running':   return 'radio_button_checked';
      case 'error':     return 'error';
      default:          return 'radio_button_unchecked';
    }
  }

  trackByStep(_: number, step: BrowserStep): number {
    return step.stepNumber;
  }
}
```

---

### `task-execution-panel.component.html`

```html
<div class="panel-overlay" (click)="onClose()" aria-hidden="true"></div>

<div class="panel" [@panelEnter] role="dialog" aria-labelledby="panel-title" aria-modal="true">

  <!-- ── Panel Header ─────────────────────────────────────────────────── -->
  <header class="panel__header">
    <div class="panel__header-left">
      <div class="panel__header-icon">
        <mat-icon>auto_awesome</mat-icon>
      </div>
      <div>
        <h2 class="panel__title" id="panel-title">{{ taskName }}</h2>
        <p class="panel__subtitle mono">{{ taskId }}</p>
      </div>
    </div>
    <div class="panel__header-right">
      <app-status-badge
        [status]="executionStatus() === 'executing' ? 'running'
                : executionStatus() === 'completed' ? 'active'
                : executionStatus() === 'intent' ? 'running'
                : 'idle'"
      />
      @if (executionStatus() === 'executing' || executionStatus() === 'intent') {
        <button
          mat-button
          class="btn-danger"
          (click)="stopExecution()"
          aria-label="Stop task execution"
        >
          <mat-icon>stop</mat-icon>
          Stop
        </button>
      }
      <button
        mat-icon-button
        class="panel__close-btn"
        (click)="onClose()"
        aria-label="Close execution panel"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
  </header>

  <!-- ── Panel Body ──────────────────────────────────────────────────── -->
  <div class="panel__body">

    <!-- LEFT: Intent Column -->
    <aside class="panel__intent" aria-label="Intent recognition">

      <div class="intent__section">
        <div class="intent__section-label">
          <mat-icon>psychology</mat-icon>
          <span>Understanding your request</span>
          @if (intentComplete()) {
            <mat-icon class="intent__check" aria-label="Intent recognized">check_circle</mat-icon>
          }
        </div>

        <div class="intent__stream-box" aria-live="polite" aria-label="Streaming intent analysis">
          <app-typewriter
            #typewriterRef
            [fullText]="intentText()"
            [active]="true"
          />
        </div>
      </div>

      @if (intentComplete() && intentParams()) {
        <div class="intent__params" aria-label="Parsed task parameters">
          <p class="intent__params-label">Task Parameters</p>
          <div class="intent__param-row">
            <span class="intent__param-key">Target</span>
            <span class="intent__param-val">{{ intentParams().target }}</span>
          </div>
          <div class="intent__param-row">
            <span class="intent__param-key">Action</span>
            <span class="intent__param-val">{{ intentParams().action }}</span>
          </div>
          <div class="intent__param-row">
            <span class="intent__param-key">Query</span>
            <span class="intent__param-val intent__param-val--wrap">{{ intentParams().query }}</span>
          </div>
          <div class="intent__param-row">
            <span class="intent__param-key">Output</span>
            <span class="intent__param-val">{{ intentParams().outputFormat }}</span>
          </div>
        </div>
      }

    </aside>

    <!-- RIGHT: Execution Feed Column -->
    <main class="panel__execution" aria-label="Browser execution steps">

      <!-- Feed Header -->
      <div class="exec__header">
        <div class="exec__header-left">
          <mat-icon class="exec__header-icon">bolt</mat-icon>
          <span class="exec__header-title">Browser Execution</span>
        </div>
        <div class="exec__counters" aria-live="polite">
          <span class="exec__counter mono">
            Steps: {{ completedSteps() }} / {{ totalSteps() }}
          </span>
          <span class="exec__counter mono">
            <mat-icon>timer</mat-icon>
            {{ elapsedFormatted() }}
          </span>
        </div>
      </div>

      <!-- Progress Bar -->
      <mat-progress-bar
        [value]="progressPercent()"
        mode="determinate"
        class="exec__progress"
        [attr.aria-valuenow]="progressPercent()"
        aria-label="Task progress"
      />

      <!-- Step Feed -->
      <div class="exec__feed" #stepFeed role="log" aria-live="polite" aria-label="Execution step log">

        @if (steps().length === 0 && executionStatus() === 'intent') {
          <div class="exec__waiting">
            <div class="exec__waiting-pulse"></div>
            <span class="mono">Waiting for intent recognition to complete...</span>
          </div>
        }

        @for (step of steps(); track trackByStep($index, step)) {
          <div
            class="step"
            [class.step--running]="step.status === 'running'"
            [class.step--completed]="step.status === 'completed'"
            [class.step--error]="step.status === 'error'"
            [class.step--pending]="step.status === 'pending'"
            [@stepEnter]
            [attr.aria-label]="'Step ' + step.stepNumber + ': ' + step.title + ' — ' + step.status"
          >
            <!-- Step Icon -->
            <div class="step__icon-col">
              <mat-icon
                class="step__icon"
                [class.step__icon--spin]="step.status === 'running'"
                aria-hidden="true"
              >{{ getStepIcon(step) }}</mat-icon>
              @if (!$last) {
                <div class="step__connector" aria-hidden="true"></div>
              }
            </div>

            <!-- Step Content -->
            <div class="step__content">
              <div class="step__row">
                <span class="step__number mono">{{ step.stepNumber | number:'2.0' }}</span>
                <span class="step__title">{{ step.title }}</span>
                @if (step.timestamp) {
                  <span class="step__timestamp mono" aria-label="Timestamp {{ step.timestamp }}">
                    {{ step.timestamp }}
                  </span>
                }
              </div>
              @if (step.detail) {
                <div class="step__detail mono">→ {{ step.detail }}</div>
              }
              @if (step.status === 'running') {
                <div class="step__shimmer" aria-hidden="true"></div>
              }
              @if (step.errorMessage) {
                <div class="step__error mono" role="alert">{{ step.errorMessage }}</div>
              }
            </div>
          </div>
        }

        @if (executionStatus() === 'completed') {
          <div class="exec__complete" role="status" [@stepEnter]>
            <mat-icon>verified</mat-icon>
            <span>Task completed successfully</span>
          </div>
        }

        @if (executionStatus() === 'stopped') {
          <div class="exec__stopped" role="status" [@stepEnter]>
            <mat-icon>stop_circle</mat-icon>
            <span>Task stopped by user</span>
          </div>
        }
      </div>

    </main>

  </div>
</div>
```

---

### `task-execution-panel.component.scss`

```scss
// ── Overlay ──────────────────────────────────────────────────────────────────
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 10, 21, 0.7);
  backdrop-filter: blur(4px);
  z-index: 200;
  cursor: pointer;
}

// ── Panel Shell ───────────────────────────────────────────────────────────────
.panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 201;
  width: min(1100px, 95vw);
  height: min(720px, 90vh);
  background: rgba(8, 14, 28, 0.97);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px rgba(0, 212, 255, 0.06),
    0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px rgba(0, 212, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ── Header ───────────────────────────────────────────────────────────────────
.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.panel__header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.panel__header-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--color-accent-dim), var(--color-purple-dim));
  border: 1px solid rgba(0, 212, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;

  mat-icon {
    color: var(--color-accent);
    font-size: 22px;
    width: 22px;
    height: 22px;
  }
}

.panel__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.panel__subtitle {
  font-size: 0.7rem;
  color: var(--color-muted);
  margin-top: 2px;
}

.panel__header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel__close-btn {
  color: var(--color-muted) !important;
  &:hover { color: var(--color-text) !important; }
}

// ── Body ─────────────────────────────────────────────────────────────────────
.panel__body {
  display: grid;
  grid-template-columns: 340px 1fr;
  flex: 1;
  overflow: hidden;
}

// ── Intent Column ─────────────────────────────────────────────────────────────
.panel__intent {
  border-right: 1px solid var(--color-border);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.intent__section {}

.intent__section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 12px;

  mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--color-accent); }

  .intent__check {
    color: var(--color-active);
    margin-left: auto;
  }
}

.intent__stream-box {
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 3px solid var(--color-accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  min-height: 80px;
  font-style: italic;
  line-height: 1.7;
}

.intent__params {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.intent__params-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 12px;
}

.intent__param-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child { border-bottom: none; }
}

.intent__param-key {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-muted);
  width: 56px;
  flex-shrink: 0;
}

.intent__param-val {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-accent);

  &--wrap { white-space: normal; word-break: break-word; }
}

// ── Execution Column ──────────────────────────────────────────────────────────
.panel__execution {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.exec__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.exec__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exec__header-icon {
  color: var(--color-accent);
  font-size: 18px;
  width: 18px;
  height: 18px;
}

.exec__header-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.exec__counters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.exec__counter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-muted);

  mat-icon { font-size: 14px; width: 14px; height: 14px; }
}

.exec__progress {
  height: 2px !important;
  flex-shrink: 0;
}

// ── Step Feed ────────────────────────────────────────────────────────────────
.exec__feed {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.exec__waiting {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  color: var(--color-muted);
  font-size: 0.8rem;
}

.exec__waiting-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

// ── Step Row ─────────────────────────────────────────────────────────────────
.step {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  position: relative;
  transition: background var(--transition-fast);

  &--running {
    background: rgba(0, 212, 255, 0.04);
    border-left: 2px solid var(--color-accent);

    .step__shimmer {
      position: absolute;
      inset: 0;
      border-radius: var(--radius-sm);
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(0, 212, 255, 0.05) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.8s linear infinite;
      pointer-events: none;
    }
  }

  &--completed {
    .step__title { color: var(--color-text-secondary); }
    .step__icon  { color: var(--color-active); }
  }

  &--error {
    background: var(--color-error-dim);
    border-left: 2px solid var(--color-error);
    .step__icon { color: var(--color-error); }
  }

  &--pending {
    opacity: 0.4;
  }
}

.step__icon-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 2px;
}

.step__icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
  color: var(--color-muted);
  transition: color var(--transition-fast);

  &--spin { animation: star-rotate 1s linear infinite; color: var(--color-accent); }
}

.step__connector {
  width: 1px;
  flex: 1;
  min-height: 12px;
  background: var(--color-border);
  margin-top: 4px;
}

.step__content {
  flex: 1;
  min-width: 0;
  position: relative;
}

.step__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.step__number {
  font-size: 0.65rem;
  color: var(--color-muted);
  flex-shrink: 0;
}

.step__title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-fast);
}

.step__timestamp {
  font-size: 0.65rem;
  color: var(--color-muted);
  flex-shrink: 0;
}

.step__detail {
  font-size: 0.72rem;
  color: var(--color-muted);
  margin-top: 3px;
  padding-left: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step__error {
  font-size: 0.72rem;
  color: var(--color-error);
  margin-top: 4px;
}

// ── Completion States ────────────────────────────────────────────────────────
.exec__complete,
.exec__stopped {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: 8px;
}

.exec__complete {
  background: var(--color-active-dim);
  color: var(--color-active);
  border: 1px solid rgba(34, 197, 94, 0.2);
  mat-icon { font-size: 18px; width: 18px; height: 18px; }
}

.exec__stopped {
  background: var(--color-idle-dim);
  color: var(--color-idle);
  border: 1px solid rgba(234, 179, 8, 0.2);
  mat-icon { font-size: 18px; width: 18px; height: 18px; }
}
```

---

## 4.2 Verification Checklist

Before proceeding to Phase 5, confirm:
- [ ] Clicking "Run Task" opens the panel with overlay + animation
- [ ] Intent typewriter streams text character by character in cyan italic
- [ ] After streaming, "✓ Intent recognized" badge appears
- [ ] Task parameters section renders with correct key-value rows
- [ ] Steps appear one by one in the feed as mock service emits them
- [ ] Currently running step has shimmer animation and cyan left border
- [ ] Completed steps show green checkmark icon
- [ ] Step feed auto-scrolls to the bottom as new steps arrive
- [ ] Progress bar increments as steps complete
- [ ] Elapsed timer ticks every second
- [ ] "Stop" button halts execution and shows "stopped" state
- [ ] Clicking the overlay or ✕ closes the panel
- [ ] Clicking "Send" from the add-task tile opens the panel with the custom prompt
- [ ] No TypeScript compilation errors (`ng build`)
