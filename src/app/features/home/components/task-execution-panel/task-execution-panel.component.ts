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

  private startExecution(): void {
    this.executionStatus.set('executing');
    this.totalSteps.set(12);

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
