# Demo Scenarios — Per-Task Hash-Gated Mock

## Context

Allow specific tasks to play scripted JSON mock data (intent events + browser steps) regardless of the global `useMockServices` flag. The guard: if `prompt` or `configuration` has been changed since mock was configured, execution silently falls through to real APIs. This lets developers demo polished scripted runs while ensuring any customization automatically uses real execution.

---

## Confirmed Flow

```
Task Editor  [DEV-MOCK commentable section]
  ─ User picks a scenario file from a select (empty = none)
  ─ On save: fingerprint = btoa(JSON.stringify({ prompt, configuration }))
             task.mockConfig = { scenarioFile, fingerprint }

startExecution() in home orchestrator
  ─ if task.mockConfig:
      currentFp = computeFingerprint(task.prompt, task.configuration)
      match  → activeExecution.scenarioFile = task.mockConfig.scenarioFile
      no match → scenarioFile = undefined  (silent fallthrough)
  ─ else: scenarioFile = undefined

Execution panel
  ─ receives scenarioFile as @Input
  ─ passes it to intent-stream service and browser-step service

Intent stream service  (abstract + both impls)
  ─ if scenarioFile → fetch assets/scenarios/{scenarioFile}.json
                       stream data.intent.events then emit done: true with finalResult
  ─ else → existing path (mock generic or real API)

Browser step service  (abstract + both impls)
  ─ if scenarioFile → fetch same JSON
                       walk data.steps: emit running for runningDurationMs, then completed
                       emit completion sentinel with data.result
  ─ else → existing path
```

---

## Verified Current State

| File | Key fact | Line |
|------|----------|------|
| `task.model.ts` | `Task` interface has no `mockConfig` field | 22–34 |
| `task.model.ts` | `TaskForm = Omit<Task, 'id' \| 'createdAt' \| 'updatedAt'>` — auto-inherits new fields | 36 |
| `task-editor-modal.component.ts` | `FormGroup` declared at line 51; `buildForm()` at 82; `ngOnInit()` at 65 | — |
| `task-editor-modal.component.html` | Config section ends at line 90; footer at line 93 | — |
| `home.component.ts` | `ActiveExecution` interface at line 15; `startExecution()` at line 114 | — |
| `home.component.html` | `<app-task-execution-panel>` bindings at lines 64–71 | — |
| `intent-stream.service.ts` | Abstract: `streamIntent(prompt: string)` at line 10 | — |
| `browser-use.service.ts` | `startTask(taskId, prompt, _config)` at line 36 | — |
| `task-execution-panel.component.ts` | `@Input() taskId` at line 71; `streamIntent(this.prompt)` at line 139 | — |
| `_variables.scss` | `--color-purple` and `--color-purple-dim` exist | 14–15 |
| `environment.ts` | `production: false`, `useMockServices: true` | 2–3 |
| `storage.service.ts` | `seedTasks()` returns 3 tasks; seed runs only when no `omniact_tasks` key | 70–110 |

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/core/models/scenario.model.ts` | `ScenarioStep`, `ScenarioData`, `AVAILABLE_SCENARIOS` constant |
| `src/assets/scenarios/google-news-scrape.json` | 8-step news scraping scenario |
| `src/assets/scenarios/contact-form-fill.json` | 10-step form fill scenario |

---

## Step 1 — Scenario Model

**New file: `src/app/core/models/scenario.model.ts`**

```typescript
import { IntentFinalResult } from './intent-result.model';

export interface ScenarioStep {
  stepNumber: number;
  title: string;
  detail?: string;
  runningDurationMs: number;
  durationMs: number;
  thoughts?: string;
  currentUrl?: string;
}

export interface ScenarioData {
  name: string;
  description: string;
  intent: {
    events: { token: string; eventType: string }[];
    finalResult: IntentFinalResult;
  };
  steps: ScenarioStep[];
  result: { resultMarkdown: string; hasFiles: boolean };
}

export const AVAILABLE_SCENARIOS: readonly { file: string; label: string }[] = [
  { file: 'google-news-scrape', label: 'AI News Aggregator' },
  { file: 'contact-form-fill',  label: 'Contact Form Bot' },
];
```

---

## Step 2 — Scenario JSON Files

Both in `src/assets/scenarios/` (editable without rebuild; ng serve serves them as static assets).

### `google-news-scrape.json`
```json
{
  "name": "AI News Aggregator",
  "description": "Search Google News for AI headlines and extract structured data",
  "intent": {
    "events": [
      { "token": "Detecting intent…",            "eventType": "intent_detection_started" },
      { "token": "Analyzing news search query…", "eventType": "model_selected" },
      { "token": "Building web scraping plan…",  "eventType": "intent_detected" }
    ],
    "finalResult": {
      "query": "Fetch top 10 AI tech news headlines from Google News",
      "detectedIntent": "Web Scraping — News Aggregation",
      "reasoning": "Prompt requests navigating to Google News and extracting structured headline data.",
      "confidence": 0.94,
      "stepsExecuted": 3,
      "finalResponse": "## Plan\n\n1. Navigate to Google News\n2. Search for 'AI technology'\n3. Extract top 10 headline cards\n4. Return structured JSON\n\n**Estimated steps:** 8",
      "intentModelName": "intent-classifier-v2",
      "finalModelName": "claude-3-5-sonnet",
      "success": true
    }
  },
  "steps": [
    { "stepNumber": 1, "title": "Launching browser session",  "detail": "Chromium 120.0.6099 · headless",                "runningDurationMs": 1200, "durationMs": 650 },
    { "stepNumber": 2, "title": "Navigating to Google News",  "detail": "https://news.google.com",                       "runningDurationMs": 900,  "durationMs": 700 },
    { "stepNumber": 3, "title": "Waiting for page load",      "detail": "DOM ready · 42 article cards detected",         "runningDurationMs": 800,  "durationMs": 500 },
    { "stepNumber": 4, "title": "Locating search bar",        "detail": "selector: [aria-label='Search']",               "runningDurationMs": 600,  "durationMs": 400 },
    { "stepNumber": 5, "title": "Typing search query",        "detail": "\"artificial intelligence 2025\"",              "runningDurationMs": 700,  "durationMs": 450 },
    { "stepNumber": 6, "title": "Waiting for results",        "detail": "24 results loaded · filtered to top 10",        "runningDurationMs": 1000, "durationMs": 600 },
    { "stepNumber": 7, "title": "Extracting headlines",       "detail": "10 headlines captured with source + timestamp", "runningDurationMs": 800,  "durationMs": 500 },
    { "stepNumber": 8, "title": "Structuring as JSON output", "detail": "Output: 10 records · 3 fields each",            "runningDurationMs": 600,  "durationMs": 400 }
  ],
  "result": {
    "resultMarkdown": "## Top 10 AI News Headlines\n\n| # | Headline | Source | Time |\n|---|---|---|---|\n| 1 | OpenAI Launches GPT-5 with Extended Reasoning | TechCrunch | 2h ago |\n| 2 | Google DeepMind Reveals AlphaFold 3 Breakthrough | Nature | 4h ago |\n| 3 | Anthropic Raises $3B at $18B Valuation | Bloomberg | 6h ago |\n| 4 | EU AI Act Enforcement Begins Next Month | Reuters | 8h ago |\n| 5 | Microsoft Copilot Now Available in 150 Countries | The Verge | 10h ago |\n| 6 | Meta Llama 4 Beats GPT-4 on Key Benchmarks | VentureBeat | 12h ago |\n| 7 | NVIDIA H100 Supply Constraints Ease in Q2 | Reuters | 14h ago |\n| 8 | Apple Intelligence Expands to 40 New Languages | 9to5Mac | 16h ago |\n| 9 | Stanford AI Index 2025 Report Released | Stanford News | 18h ago |\n| 10 | AI Coding Tools Used by 60% of Developers | GitHub Blog | 20h ago |",
    "hasFiles": false
  }
}
```

### `contact-form-fill.json`
```json
{
  "name": "Contact Form Bot",
  "description": "Navigate to a page, fill a contact form field by field, and submit it",
  "intent": {
    "events": [
      { "token": "Detecting intent…",                     "eventType": "intent_detection_started" },
      { "token": "Identifying form interaction pattern…", "eventType": "model_selected" },
      { "token": "Building form automation sequence…",    "eventType": "intent_detected" }
    ],
    "finalResult": {
      "query": "Fill and submit the contact form at the target URL with provided data",
      "detectedIntent": "Web Form Automation — Data Entry",
      "reasoning": "Prompt requests navigating to a page, locating form fields, entering data, and submitting.",
      "confidence": 0.96,
      "stepsExecuted": 3,
      "finalResponse": "## Plan\n\n1. Navigate to target URL\n2. Locate form fields\n3. Fill each field sequentially\n4. Submit and confirm\n\n**Estimated steps:** 10",
      "intentModelName": "intent-classifier-v2",
      "finalModelName": "claude-3-5-sonnet",
      "success": true
    }
  },
  "steps": [
    { "stepNumber": 1,  "title": "Launching browser session",  "detail": "Chromium 120.0.6099 · headed",                        "runningDurationMs": 1400, "durationMs": 700 },
    { "stepNumber": 2,  "title": "Navigating to target page",  "detail": "https://placeholder-site.example/contact",            "runningDurationMs": 1000, "durationMs": 750 },
    { "stepNumber": 3,  "title": "Waiting for page load",      "detail": "DOM ready · contact form located",                    "runningDurationMs": 800,  "durationMs": 500 },
    { "stepNumber": 4,  "title": "Locating name field",        "detail": "selector: input[name='name']",                        "runningDurationMs": 600,  "durationMs": 400 },
    { "stepNumber": 5,  "title": "Typing full name",           "detail": "\"John Doe\"",                                        "runningDurationMs": 700,  "durationMs": 350 },
    { "stepNumber": 6,  "title": "Locating email field",       "detail": "selector: input[type='email']",                       "runningDurationMs": 500,  "durationMs": 350 },
    { "stepNumber": 7,  "title": "Typing email address",       "detail": "\"john.doe@example.com\"",                            "runningDurationMs": 600,  "durationMs": 300 },
    { "stepNumber": 8,  "title": "Locating message textarea",  "detail": "selector: textarea[name='message']",                  "runningDurationMs": 500,  "durationMs": 350 },
    { "stepNumber": 9,  "title": "Typing message body",        "detail": "68 characters entered",                               "runningDurationMs": 900,  "durationMs": 500 },
    { "stepNumber": 10, "title": "Clicking submit button",     "detail": "selector: button[type='submit'] · response: 200 OK",  "runningDurationMs": 1200, "durationMs": 700 }
  ],
  "result": {
    "resultMarkdown": "## Form Submitted Successfully\n\n**Status:** 200 OK\n\n| Field | Value |\n|---|---|\n| Name | John Doe |\n| Email | john.doe@example.com |\n| Message | *(placeholder message body)* |\n\n**Confirmation:** \"Thank you for reaching out! We'll get back to you within 24 hours.\"\n\n> Replace placeholder values with real data when testing against a real site.",
    "hasFiles": false
  }
}
```

---

## Step 3 — Task Model: Add `TaskMockConfig` + `computeFingerprint`

**File: `src/app/core/models/task.model.ts`**

Add after the `TaskConfiguration` interface (before line 22):

```typescript
export interface TaskMockConfig {
  scenarioFile: string;
  fingerprint: string;
}

export function computeFingerprint(prompt: string, configuration: TaskConfiguration): string {
  return btoa(JSON.stringify({ prompt, configuration }));
}
```

Add `mockConfig?: TaskMockConfig;` as the last field of the `Task` interface (before the closing `}`).

`TaskForm` automatically inherits `mockConfig?` via its `Omit<Task, ...>` definition — no change needed.

---

## Step 4 — Storage Service: 2 Demo Seed Tasks

**File: `src/app/core/services/storage.service.ts`**

Import `computeFingerprint` and `TaskMockConfig` from the task model. Append inside `seedTasks()` after the existing `task-price-tracker` entry:

```typescript
{
  id: 'task-demo-news-scrape',
  title: 'AI News Aggregator',
  description: 'Search Google News for the latest AI headlines, extract top 10 results and return them as a structured table.',
  prompt: 'Go to Google News and search for "artificial intelligence 2025". Extract the top 10 article headlines, their source, and timestamp. Return as a markdown table.',
  category: 'data-scraping' as TaskCategory,
  scheduler: { type: 'none' },
  configuration: { mode: 'headless' },
  status: 'idle',
  isPublished: false,
  createdAt: now,
  updatedAt: now,
  mockConfig: (() => {
    const prompt = 'Go to Google News and search for "artificial intelligence 2025". Extract the top 10 article headlines, their source, and timestamp. Return as a markdown table.';
    const configuration: TaskConfiguration = { mode: 'headless' };
    return { scenarioFile: 'google-news-scrape', fingerprint: computeFingerprint(prompt, configuration) };
  })(),
},
{
  id: 'task-demo-form-fill',
  title: 'Contact Form Bot',
  description: 'Navigate to a target webpage, locate the contact form, fill in name/email/message fields and submit it automatically.',
  prompt: 'Go to https://placeholder-site.example/contact and fill the contact form with: Name="John Doe", Email="john.doe@example.com", Message="Hello, I would like to learn more about your services." Then click submit.',
  category: 'web-automation' as TaskCategory,
  scheduler: { type: 'none' },
  configuration: { mode: 'headed' },
  status: 'idle',
  isPublished: false,
  createdAt: now,
  updatedAt: now,
  mockConfig: (() => {
    const prompt = 'Go to https://placeholder-site.example/contact and fill the contact form with: Name="John Doe", Email="john.doe@example.com", Message="Hello, I would like to learn more about your services." Then click submit.';
    const configuration: TaskConfiguration = { mode: 'headed' };
    return { scenarioFile: 'contact-form-fill', fingerprint: computeFingerprint(prompt, configuration) };
  })(),
},
```

> Seed only runs when `omniact_tasks` is absent from localStorage. Clear it in DevTools to re-seed.

---

## Step 5 — Task Editor: Commentable Mock Scenario Section

### `task-editor-modal.component.ts`

Add import at top:
```typescript
import { environment } from '../../../../../environments/environment';
import { AVAILABLE_SCENARIOS } from '../../../../core/models/scenario.model';
import { computeFingerprint, TaskMockConfig } from '../../../../core/models/task.model';
```

Add to `FormGroup` (after `isPublished`):
```typescript
mockScenario: new FormControl<string>('', { nonNullable: true }),
```

Add to class body:
```typescript
readonly showMockSection   = !environment.production;
readonly availableScenarios = AVAILABLE_SCENARIOS;
```

In `ngOnInit()`, add to `patchValue()` call:
```typescript
mockScenario: this.existingTask.mockConfig?.scenarioFile ?? '',
```

In `buildForm()`, after building `configuration`, compute `mockConfig`:
```typescript
const mockConfig: TaskMockConfig | undefined = v.mockScenario
  ? { scenarioFile: v.mockScenario, fingerprint: computeFingerprint(v.prompt, { mode: v.configMode }) }
  : undefined;
```
Add `mockConfig` to the returned object.

### `task-editor-modal.component.html`

Add inside `<div class="modal__body">` **after** the Configuration section (after line 90):

```html
<!-- [DEV-MOCK] Remove or comment this block before production deployment -->
@if (showMockSection) {
  <div class="modal__field">
    <label class="modal__label" for="te-mock-scenario">Mock scenario <span class="modal__dev-badge">DEV</span></label>
    <select id="te-mock-scenario" class="modal__select" formControlName="mockScenario"
            aria-label="Mock scenario file">
      <option value="">— None (use real API) —</option>
      @for (s of availableScenarios; track s.file) {
        <option [value]="s.file">{{ s.label }}</option>
      }
    </select>
    @if (form.controls.mockScenario.value) {
      <p class="modal__mock-hint">Fingerprint locked on save · changes to prompt/config will disable mock</p>
    }
  </div>
}
<!-- [/DEV-MOCK] -->
```

### `task-editor-modal.component.scss`

Add:
```scss
.modal__dev-badge {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--color-purple);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 4px;
  padding: 1px 5px;
  vertical-align: middle;
  margin-left: 4px;
}

.modal__mock-hint {
  font-size: 0.62rem;
  color: var(--color-purple);
  margin: 4px 0 0;
}
```

---

## Step 6 — Home Orchestrator: Fingerprint Check

### `home.component.ts`

Add import:
```typescript
import { computeFingerprint } from '../../core/models/task.model';
```

Update `ActiveExecution` interface — add field:
```typescript
scenarioFile?: string;
```

In `startExecution()`, after computing `runId` and before `this.activeExecution.set(...)`, add:
```typescript
let scenarioFile: string | undefined;
if (task.mockConfig) {
  const currentFp = computeFingerprint(task.prompt, task.configuration);
  if (currentFp === task.mockConfig.fingerprint) {
    scenarioFile = task.mockConfig.scenarioFile;
  }
}
```

Add `scenarioFile` to the `activeExecution.set({...})` call.

### `home.component.html`

Add binding to `<app-task-execution-panel>`:
```html
[scenarioFile]="activeExecution()!.scenarioFile ?? null"
```

---

## Step 7 — Execution Panel: Forward scenarioFile

**File: `task-execution-panel.component.ts`**

Add input after existing inputs:
```typescript
@Input() scenarioFile: string | null = null;
```

Line 139 — change:
```typescript
// Before:
this.intentService.streamIntent(this.prompt)
// After:
this.intentService.streamIntent(this.prompt, this.scenarioFile ?? undefined)
```

Find where `startTask()` is called on the browser service and add `this.scenarioFile ?? undefined` as the last argument.

---

## Step 8 — Intent Stream Service

**File: `src/app/core/services/intent-stream.service.ts`**

Abstract class — add `scenarioFile?` param:
```typescript
abstract streamIntent(prompt: string, scenarioFile?: string): Observable<IntentChunk>;
```

`RealIntentStreamService` — add `_scenarioFile?: string`, no logic change:
```typescript
streamIntent(prompt: string, _scenarioFile?: string): Observable<IntentChunk>
```

`MockIntentStreamService` — add param + scenario branch:

```typescript
streamIntent(prompt: string, scenarioFile?: string): Observable<IntentChunk> {
  this.cancelled = false;
  if (scenarioFile) return this.streamFromScenario(scenarioFile);
  return this.streamGeneric(prompt);
}

private streamGeneric(prompt: string): Observable<IntentChunk> {
  // move the existing Observable body here unchanged
}

private streamFromScenario(scenarioFile: string): Observable<IntentChunk> {
  return new Observable<IntentChunk>(observer => {
    fetch(`assets/scenarios/${scenarioFile}.json`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then((data: ScenarioData) => {
        let i = 0;
        const id = setInterval(() => {
          if (this.cancelled) { clearInterval(id); observer.complete(); return; }
          if (i < data.intent.events.length) {
            const ev = data.intent.events[i++];
            observer.next({ token: ev.token, done: false, eventType: ev.eventType });
          } else {
            clearInterval(id);
            observer.next({ token: '', done: true, finalResult: data.intent.finalResult });
            observer.complete();
          }
        }, MOCK_INTENT_STREAM_DELAY_MS);
      })
      .catch(() => this.streamGeneric('').subscribe(observer));
  });
}
```

Import `ScenarioData` from `../models/scenario.model`.

---

## Step 9 — Browser Use Service

**File: `src/app/core/services/browser-use.service.ts`**

Abstract class — update `startTask` signature:
```typescript
abstract startTask(taskId: string, prompt: string, config: TaskConfiguration, scenarioFile?: string): Observable<BrowserStep>;
```

`RealBrowserUseService` — add `_scenarioFile?: string`, no logic change.

`MockBrowserUseService`:

```typescript
startTask(taskId: string, prompt: string, config: TaskConfiguration, scenarioFile?: string): Observable<BrowserStep> {
  if (scenarioFile) return this.startFromScenario(scenarioFile, taskId, prompt);
  return this.runGeneric(taskId, prompt);
}

private runGeneric(taskId: string, prompt: string): Observable<BrowserStep> {
  // move the existing Observable body here unchanged
}

private startFromScenario(scenarioFile: string, taskId: string, prompt: string): Observable<BrowserStep> {
  const stop$ = new Subject<void>();
  this.stopSubjects.set(taskId, stop$);

  return new Observable<BrowserStep>(observer => {
    fetch(`assets/scenarios/${scenarioFile}.json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: ScenarioData) => {
        let index = 0;
        const emit = () => {
          if (index >= data.steps.length) {
            observer.next({
              stepNumber: 0, title: 'Completed', status: 'completed',
              resultMarkdown: data.result.resultMarkdown,
              hasFiles: data.result.hasFiles,
            });
            observer.complete();
            return;
          }
          const s = data.steps[index];
          const running: BrowserStep = {
            stepNumber: s.stepNumber, title: s.title, detail: s.detail,
            thoughts: s.thoughts, currentUrl: s.currentUrl,
            status: 'running', timestamp: new Date().toTimeString().slice(0, 8),
          };
          observer.next(running);
          setTimeout(() => {
            observer.next({ ...running, status: 'completed', durationMs: s.durationMs });
            index++;
            setTimeout(emit, 300 + Math.random() * 200);
          }, s.runningDurationMs);
        };
        emit();
      })
      .catch(() => this.runGeneric(taskId, prompt).subscribe(observer));
  }).pipe(takeUntil(stop$));
}
```

Import `ScenarioData` from `../models/scenario.model`.

---

## Implementation Prompt

**PROMPT START**

You are implementing a per-task hash-gated mock scenario system for an Angular frontend called OmniAct in `f:\vibe_code_bases\omniact-fe` (or the equivalent path on the current server).

**Goal:** Let specific tasks play scripted JSON mock data (intent stream + browser steps) regardless of the global mock/real service flag. Guard: if `prompt` or `configuration` has changed since the mock was configured, execution silently falls through to real APIs.

**Do not reference specific API URLs, WebSocket endpoints, or backend model shapes.** The backend has been updated; only the Angular frontend concerns you. Use the interfaces and types already present in the codebase — adapt names as needed if they have been renamed.

---

### What to build

**1. Scenario model**
Create `src/app/core/models/scenario.model.ts` exporting:
- `ScenarioStep` interface: `{ stepNumber, title, detail?, runningDurationMs, durationMs, thoughts?, currentUrl? }`
- `ScenarioData` interface: `{ name, description, intent: { events: {token, eventType}[], finalResult }, steps: ScenarioStep[], result: { resultMarkdown, hasFiles } }`
- `AVAILABLE_SCENARIOS` constant: array of `{ file: string; label: string }` for each scenario

**2. Scenario JSON files**
Create `src/assets/scenarios/google-news-scrape.json` (8 steps, news scraping theme) and `src/assets/scenarios/contact-form-fill.json` (10 steps, form fill theme). Each must match the `ScenarioData` shape. Use realistic placeholder content. The `intent.finalResult` must match the shape of whatever `IntentFinalResult` interface already exists in the codebase.

**3. Task model — add mock config**
In the task data model file, add:
```typescript
export interface TaskMockConfig {
  scenarioFile: string;
  fingerprint: string;
}

export function computeFingerprint(prompt: string, configuration: <TaskConfiguration type>): string {
  return btoa(JSON.stringify({ prompt, configuration }));
}
```
Add `mockConfig?: TaskMockConfig` as an optional field on the main task interface. The `TaskForm` type (which omits only id/timestamps) will inherit this automatically.

**4. Storage / seed service**
Find where seed tasks are created (they run only on first load when localStorage has no task data). Append 2 new demo tasks with `mockConfig` pre-wired — compute the fingerprint inline using `computeFingerprint` with the task's literal prompt and configuration. Task IDs: `task-demo-news-scrape` (category: data-scraping, mode: headless) and `task-demo-form-fill` (category: web-automation, mode: headed).

**5. Task editor — commentable mock section**
Find the task editor modal component. Add a `mockScenario: FormControl<string>` (non-nullable, default `''`) to the existing form group.

Add to the class:
- `readonly showMockSection = !environment.production`
- `readonly availableScenarios = AVAILABLE_SCENARIOS`

In the existing `buildForm()` method, when building the return object, compute `mockConfig`:
```
if mockScenario is non-empty:
  mockConfig = { scenarioFile: mockScenario, fingerprint: computeFingerprint(prompt, configuration) }
else:
  mockConfig = undefined
```

In `ngOnInit()`, patch `mockScenario` from `existingTask.mockConfig?.scenarioFile ?? ''`.

In the HTML, add a commentable `<!-- [DEV-MOCK] -->` block inside the form body (after the configuration/browser mode section). The block contains a `<select formControlName="mockScenario">` with an empty "None" option followed by one `<option>` per AVAILABLE_SCENARIOS entry. Show a small hint text when a scenario is selected. Gate the whole block with `@if (showMockSection)`.

In the SCSS, add styles for a `DEV` badge label and a mock hint text (use `--color-purple` and `--color-purple-dim` which already exist in the design tokens).

**6. Home orchestrator — fingerprint check at run time**
Find the component/service that creates the active execution state (the object that carries `taskId`, `runId`, `prompt`, `taskName`, `configuration` to the execution panel). Add an optional `scenarioFile?: string` field to that state interface.

In the method that starts execution, before setting the active execution state:
```
if task.mockConfig:
  currentFp = computeFingerprint(task.prompt, task.configuration)
  if currentFp === task.mockConfig.fingerprint:
    scenarioFile = task.mockConfig.scenarioFile
  else:
    scenarioFile = undefined   // silent fallthrough
else:
  scenarioFile = undefined
```
Include `scenarioFile` in the active execution state that gets passed to the execution panel.

In the home template, bind `[scenarioFile]="activeExecution()!.scenarioFile ?? null"` on the execution panel element.

**7. Execution panel — forward scenarioFile**
Find the task execution panel component. Add `@Input() scenarioFile: string | null = null`.

Pass `this.scenarioFile ?? undefined` as an additional argument wherever `streamIntent()` is called on the intent service, and wherever `startTask()` is called on the browser step service.

**8. Intent streaming service — add scenarioFile param**
Find the abstract class / interface for the intent streaming service. Change the signature:
```
streamIntent(prompt: string, scenarioFile?: string): Observable<IntentChunk>
```

In the real implementation: accept `_scenarioFile?: string`, ignore it.

In the mock implementation:
- If `scenarioFile` is provided, fetch `assets/scenarios/${scenarioFile}.json`, stream `data.intent.events` one by one using the existing delay constant, then emit `{ done: true, finalResult: data.intent.finalResult }`.
- If fetch fails, fall back to the existing generic mock.
- If `scenarioFile` is absent, run the existing generic mock (extract it into a private `streamGeneric()` method).

**9. Browser step execution service — add scenarioFile param**
Find the abstract class / interface for the browser step execution service. Change `startTask`:
```
startTask(taskId, prompt, config, scenarioFile?: string): Observable<BrowserStep>
```

In the real implementation: accept `_scenarioFile?: string`, ignore it.

In the mock implementation:
- If `scenarioFile` is provided, fetch the same JSON, walk `data.steps`: emit each step as `status: 'running'` for `runningDurationMs` ms, then `status: 'completed'` with a ~300–500ms gap, then move to the next. After all steps, emit a completion sentinel (`stepNumber: 0`, `status: 'completed'`, `resultMarkdown: data.result.resultMarkdown`, `hasFiles: data.result.hasFiles`).
- If fetch fails, fall back to generic mock.
- If `scenarioFile` is absent, run existing generic mock (extract to `runGeneric()`).
- Respect the existing stop/cancel mechanism (`takeUntil` or equivalent).

**10. Run `ng build`** and fix any TypeScript errors before finishing.

**Constraints:**
- No `any` types
- No inline styles
- No `<form>` tags (use reactive forms pattern already in place)
- Use `fetch()` (not `HttpClient`) for loading JSON in services
- All new components standalone (though no new components are created here)
- Follow BEM class naming already used in the project

**PROMPT END**

---

## Verification

1. `ng build` — zero TS errors
2. Clear localStorage; reload — 5 task cards appear (3 existing + 2 demo)
3. Open editor on "AI News Aggregator" — mock section shows, "AI News Aggregator" is pre-selected; close without changes
4. Run "AI News Aggregator" — intent shows 3 news-specific events → plan finalResponse → 8 steps play sequentially → headlines table in result
5. Run "Contact Form Bot" — 3 form events → plan → 10 field-fill steps → form submission result
6. Edit any existing task, pick "AI News Aggregator" scenario, save — run it → plays that scenario
7. Edit the same task, change the prompt by one character, save (fingerprint changes) — run it → uses real API (or generic mock if `useMockServices: true`)
8. Revert the prompt back exactly, save — mock activates again
9. Edit `google-news-scrape.json` headline text → page refresh only (no rebuild) → next run shows updated headline
