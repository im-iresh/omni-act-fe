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
  @Input() speed = 18;
  @Input() active = false;
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
