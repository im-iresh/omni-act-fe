import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  ViewChild, ElementRef, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, transition, style, animate } from '@angular/animations';
import { marked } from 'marked';

import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { INTENT_STREAM_SERVICE, BROWSER_USE_SERVICE } from '../../../../core/tokens/service.tokens';
import { BrowserStep } from '../../../../core/models/browser-step.model';
import { IntentResult, IntentFinalResult } from '../../../../core/models/intent-result.model';
import { TaskConfiguration } from '../../../../core/models/task.model';

export interface ExecutionCompleteEvent {
  runId: string;
  taskId: string;
  resultMarkdown?: string;
  hasFiles: boolean;
  completedSteps: number;
}

@Component({
  selector: 'app-task-execution-panel',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatChipsModule, MatTooltipModule,
    StatusBadgeComponent
  ],
  templateUrl: './task-execution-panel.component.html',
  styleUrls: ['./task-execution-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('panelEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translate(-50%, -50%) scale(0.96) translateY(16px)' }),
        animate('350ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in',
          style({ opacity: 0, transform: 'translate(-50%, -50%) scale(0.96) translateY(8px)' }))
      ])
    ]),
    trigger('stepEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('eventFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-6px)' }))
      ])
    ])
  ]
})
export class TaskExecutionPanelComponent implements OnInit, OnDestroy {
  @Input({ required: true }) taskId!: string;
  @Input({ required: true }) runId!: string;
  @Input({ required: true }) prompt!: string;
  @Input() taskName = 'Task';
  @Input() configuration: TaskConfiguration = { mode: 'headless' };

  @Output() close    = new EventEmitter<void>();
  @Output() complete = new EventEmitter<ExecutionCompleteEvent>();

  @ViewChild('stepFeed') stepFeedRef!: ElementRef<HTMLDivElement>;

  private intentService  = inject(INTENT_STREAM_SERVICE);
  private browserService = inject(BROWSER_USE_SERVICE);
  private destroy$       = new Subject<void>();

  currentEventLabel  = signal('');
  intentComplete     = signal(false);
  intentParams       = signal<Partial<IntentResult>>({});
  intentFinalResponse = signal('');

  intentFinalHtml = computed((): string => {
    const md = this.intentFinalResponse();
    return md ? (marked.parse(md) as string) : '';
  });

  steps           = signal<BrowserStep[]>([]);
  elapsedSeconds  = signal(0);
  executionStatus = signal<'intent' | 'executing' | 'completed' | 'stopped' | 'error'>('intent');
  resultMarkdown  = signal<string | null>(null);
  hasFiles        = signal(false);

  resultHtml = computed((): string => {
    const md = this.resultMarkdown();
    return md ? (marked.parse(md) as string) : '';
  });

  totalSteps     = computed(() => this.steps().length);
  completedSteps = computed(() => this.steps().filter(s => s.status === 'completed').length);
  progressPercent = computed(() =>
    this.totalSteps() > 0
      ? Math.round((this.completedSteps() / this.totalSteps()) * 100)
      : 0
  );
  showResults = computed(() => this.executionStatus() === 'completed');

  elapsedFormatted = computed(() => {
    const s = this.elapsedSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  private timerSub?: ReturnType<typeof setInterval>;

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

  private streamIntent(): void {
    this.intentService
      .streamIntent(this.prompt)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => {
          if (!chunk.done) {
            if (chunk.token) this.currentEventLabel.set(chunk.token);
          } else {
            this.intentComplete.set(true);
            if (chunk.finalResult?.finalResponse) {
              this.intentFinalResponse.set(chunk.finalResult.finalResponse);
            }
            this.parseIntentParams(chunk.finalResult);
            this.startExecution();
          }
        },
        error: () => this.executionStatus.set('error')
      });
  }

  private parseIntentParams(finalResult?: IntentFinalResult): void {
    if (finalResult) {
      this.intentParams.set({
        target: this.detectTarget(this.prompt),
        action: finalResult.detectedIntent,
        query: finalResult.reasoning.length > 120
          ? finalResult.reasoning.slice(0, 117) + '…'
          : finalResult.reasoning,
        outputFormat: finalResult.finalModelName,
        confidence: finalResult.confidence,
      });
    } else {
      this.intentParams.set({
        target: this.detectTarget(this.prompt),
        action: this.prompt.toLowerCase().includes('scrape') || this.prompt.toLowerCase().includes('fetch')
          ? 'Scrape & Extract Data'
          : this.prompt.toLowerCase().includes('search') ? 'Search & Collect'
          : 'Automated Browsing',
        query: this.prompt.length > 60 ? this.prompt.slice(0, 57) + '…' : this.prompt,
        outputFormat: 'Structured JSON',
      });
    }
  }

  private detectTarget(prompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes('amazon')) return 'Amazon.in';
    if (p.includes('linkedin')) return 'LinkedIn.com';
    return 'Web Browser';
  }

  private startExecution(): void {
    this.executionStatus.set('executing');

    this.browserService
      .startTask(this.taskId, this.prompt, this.configuration)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (step) => this.handleStepUpdate(step),
        complete: () => {
          this.executionStatus.set('completed');
          if (this.timerSub) clearInterval(this.timerSub);
          this.complete.emit({
            runId: this.runId,
            taskId: this.taskId,
            resultMarkdown: this.resultMarkdown() ?? undefined,
            hasFiles: this.hasFiles(),
            completedSteps: this.completedSteps(),
          });
        },
        error: () => this.executionStatus.set('error')
      });
  }

  private handleStepUpdate(step: BrowserStep): void {
    if (step.resultMarkdown) this.resultMarkdown.set(step.resultMarkdown);
    if (step.hasFiles)       this.hasFiles.set(true);

    if (step.stepNumber === 0) return;

    this.steps.update(current => {
      const idx = current.findIndex(s => s.stepNumber === step.stepNumber);
      if (idx >= 0) {
        const updated = [...current];
        updated[idx] = step;
        return updated;
      }
      return [...current, step];
    });

    setTimeout(() => this.scrollFeedToBottom(), 50);
  }

  private scrollFeedToBottom(): void {
    if (this.stepFeedRef?.nativeElement) {
      this.stepFeedRef.nativeElement.scrollTop =
        this.stepFeedRef.nativeElement.scrollHeight;
    }
  }

  private startTimer(): void {
    this.timerSub = setInterval(() => {
      this.elapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  stopExecution(): void {
    this.browserService.stopTask(this.taskId);
    this.intentService.cancelStream();
    this.executionStatus.set('stopped');
    if (this.timerSub) clearInterval(this.timerSub);
  }

  downloadFiles(): void {
    this.browserService.fetchFiles(this.taskId);
  }

  onClose(): void {
    this.stopExecution();
    this.close.emit();
  }

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
