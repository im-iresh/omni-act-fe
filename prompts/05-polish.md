# Phase 5 — Polish, Responsiveness & Real Service Integration

> **Claude Code instruction**: Run this phase after `04-execution.md` is fully verified.
> This phase adds finishing touches, responsive behavior, and the real backend wiring guide.

---

## 5.1 Micro-Interaction Polish

### Template card hover lift — update in `template-card.component.scss`

The base hover rule already exists. Reinforce with a subtle inner highlight:

```scss
.tcard:hover {
  border-color: rgba(0, 212, 255, 0.22);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transform: translateY(-2px);
}
```

### "Run" button pulse when card is hovered — add to `template-card.component.scss`

```scss
.tcard:hover .btn-primary {
  animation: glow-breathe 2s ease-in-out infinite;
}
```

### Extract shared modal SCSS partial — `styles/_modal.scss`

Both `NewTaskModalComponent` and `TemplateEditorModalComponent` share identical
overlay, header, close-button, body, and footer patterns. In Phase 5, extract them:

```scss
// styles/_modal.scss
// Import in both modal component .scss files with: @use 'styles/modal' as *;

.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(6, 9, 15, 0.78);
  backdrop-filter: blur(4px);
  z-index: 300; cursor: pointer;
}

.modal-shell {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 301;
  background: #0b1120;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7);
}

.modal__close {
  margin-left: auto; width: 28px; height: 28px; border-radius: var(--radius-sm);
  background: transparent; border: 1px solid var(--color-border);
  color: var(--color-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color var(--transition-fast), color var(--transition-fast);
  mat-icon { font-size: 15px; }
  &:hover { border-color: rgba(255,255,255,0.15); color: var(--color-text-secondary); }
}
```

Then remove duplicate CSS from both component SCSS files.

### Navbar logo glow on hover — add to `navbar.component.scss`

```scss
.navbar__logo:hover .navbar__logo-icon {
  box-shadow: var(--glow-accent);
  transform: scale(1.05);
  transition: box-shadow var(--transition-fast), transform var(--transition-fast);
}
```

---

## 5.2 Responsive Breakpoints — add to `styles.scss`

```scss
// ─── Tablet (≤ 900px) ─────────────────────────────────────────────────────
@media (max-width: 900px) {
  .panel__body {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto 1fr;
  }

  .panel__intent {
    border-right: none !important;
    border-bottom: 1px solid var(--color-border);
    max-height: 240px;
  }

  .navbar__links { display: none; }

  .home__tiles { padding: 0 16px 32px; }
  .home__hero  { padding: 32px 16px 24px; }
}

// ─── Mobile (≤ 600px) ─────────────────────────────────────────────────────
@media (max-width: 600px) {
  .panel {
    width: 100vw !important;
    height: 100vh !important;
    top: 0 !important;
    left: 0 !important;
    transform: none !important;
    border-radius: 0 !important;
  }

  .navbar {
    padding: 0 16px;
    gap: 16px;
  }

  .navbar__search { display: none; }

  .tile { width: 260px; }
  .add-tile { width: 260px; }
}
```

---

## 5.3 Accessibility Additions

Add these to `styles.scss`:

```scss
// ─── Focus ring ────────────────────────────────────────────────────────────
*:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

// ─── Reduced motion ────────────────────────────────────────────────────────
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5.4 Empty State for Tile Grid

In `home.component.html`, wrap the tile loop with a loading/empty guard:

```html
<!-- Inside .home__tiles, before @for -->
@if (templates.length === 0) {
  <div class="home__empty">
    <mat-icon>auto_awesome</mat-icon>
    <p>No task templates yet. Add your first task.</p>
  </div>
}
```

Add to `home.component.scss`:
```scss
.home__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: var(--color-muted);
  font-size: 0.9rem;

  mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
}
```

---

## 5.5 Error Snackbar — `HomeComponent`

Add `MatSnackBar` injection and a global error handler:

```typescript
// In home.component.ts imports:
import { MatSnackBar } from '@angular/material/snack-bar';

// In HomeComponent class:
private snackBar = inject(MatSnackBar);

showError(message: string): void {
  this.snackBar.open(message, 'Dismiss', {
    duration: 5000,
    panelClass: ['snack-error'],
    horizontalPosition: 'right',
    verticalPosition: 'bottom'
  });
}
```

Add to `styles.scss`:
```scss
.snack-error {
  .mdc-snackbar__surface {
    background: var(--color-error-dim) !important;
    border: 1px solid rgba(239, 68, 68, 0.3) !important;
    color: var(--color-error) !important;
  }
}
```

---

## 5.6 Real Backend Integration Guide

### Step 1 — Create real service files

**`src/app/core/services/real-intent-stream.service.ts`**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IntentStreamService } from './intent-stream.service';
import { IntentChunk } from '../models/intent-result.model';

@Injectable()
export class RealIntentStreamService extends IntentStreamService {
  private eventSource: EventSource | null = null;

  streamIntent(prompt: string): Observable<IntentChunk> {
    return new Observable<IntentChunk>(observer => {
      // Replace with your actual SSE endpoint
      const url = `/api/intent/stream?prompt=${encodeURIComponent(prompt)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.done) {
            observer.next({ token: '', done: true });
            observer.complete();
            this.eventSource?.close();
          } else {
            observer.next({ token: data.token, done: false });
          }
        } catch {
          observer.next({ token: event.data, done: false });
        }
      };

      this.eventSource.onerror = (err) => {
        observer.error(err);
        this.eventSource?.close();
      };

      // Cleanup
      return () => this.eventSource?.close();
    });
  }

  cancelStream(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
```

**`src/app/core/services/real-browser-use.service.ts`**
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, map } from 'rxjs';
import { BrowserUseService } from './browser-use.service';
import { BrowserStep, TaskExecution } from '../models/browser-step.model';

@Injectable()
export class RealBrowserUseService extends BrowserUseService {
  private http = inject(HttpClient);

  startTask(taskId: string, prompt: string): Observable<BrowserStep> {
    // 1. POST to start the task
    // 2. Poll for step updates
    // Replace URLs with your actual endpoints

    return this.http
      .post<{ taskId: string }>('/api/tasks/start', { taskId, prompt })
      .pipe(
        switchMap(() =>
          interval(1500).pipe(
            switchMap(() =>
              this.http.get<BrowserStep>(`/api/tasks/${taskId}/latest-step`)
            ),
            takeWhile(step => step.status !== 'completed' && step.status !== 'error', true)
          )
        )
      );
  }

  stopTask(taskId: string): void {
    this.http.post(`/api/tasks/${taskId}/stop`, {}).subscribe();
  }

  getExecution(taskId: string): TaskExecution | null {
    // Optionally implement with a sync cache
    return null;
  }
}
```

### Step 2 — Swap providers via environment

In `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  useMockServices: true   // ← set to false to use real backend
};
```

In `src/app/app.config.ts` (or `AppModule` providers):
```typescript
import { environment } from '../environments/environment';
import { MockIntentStreamService, IntentStreamService } from './core/services/intent-stream.service';
import { RealIntentStreamService } from './core/services/real-intent-stream.service';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: IntentStreamService,
      useClass: environment.useMockServices
        ? MockIntentStreamService
        : RealIntentStreamService
    },
    // Same pattern for BrowserUseService
  ]
};
```

### Step 3 — Update `TaskExecutionPanelComponent`

Change `inject(MockIntentStreamService)` to `inject(IntentStreamService)` and `inject(MockBrowserUseService)` to `inject(BrowserUseService)` so it uses the DI token, not the concrete mock.

---

## 5.7 Final Verification Checklist

- [ ] `ng build --configuration production` produces zero errors and zero warnings
- [ ] Lighthouse accessibility score ≥ 90
- [ ] All interactive elements reachable by keyboard (Tab + Enter)
- [ ] Focus ring visible on all focusable elements
- [ ] Templates persist across page reloads (check DevTools → Application → Local Storage → `omniact_templates`)
- [ ] History persists across page reloads (check `omniact_history`)
- [ ] Deleting all templates and reloading re-seeds the three default templates
- [ ] Panel correctly stacks (intent on top, execution below) on tablet viewport
- [ ] Panel fills full screen on mobile viewport
- [ ] Card rows scroll horizontally on mobile without breaking layout
- [ ] Both modals render with `#0b1120` background — no white surfaces
- [ ] History section collapses and expands cleanly with chevron animation
- [ ] `prefers-reduced-motion` disables all animations cleanly
- [ ] Switching `useMockServices: false` in environment compiles without errors
- [ ] No `console.error` or uncaught Observables in browser DevTools
- [ ] ✦ star is visible and slowly rotates bottom-right

---

## 5.8 Suggested Follow-up Phases (not in scope now)

| Phase | Feature |
|---|---|
| Phase 6 | Result panel — display scraped/structured output after execution completes |
| Phase 7 | Export / import JSON button for templates in the Templates section header |
| Phase 8 | Settings drawer — configure endpoints, API keys, proxy |
| Phase 9 | Workflow templates editor — chain multiple tasks into a sequence |
