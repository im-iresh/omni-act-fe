# OmniAct — API & UI Integration Guide

This document explains every backend call the frontend makes, how data flows through the Angular layers, and how each piece connects to what the user sees. Read this before modifying any service, model, or execution component.

---

## Table of Contents

1. [Architecture at a Glance](#1-architecture-at-a-glance)
2. [Switching Between Mock and Real Services](#2-switching-between-mock-and-real-services)
3. [Intent Stream API](#3-intent-stream-api)
4. [Browser-Use API (HTTP + WebSocket)](#4-browser-use-api-http--websocket)
5. [Angular Dependency Injection Tokens](#5-angular-dependency-injection-tokens)
6. [Data Models](#6-data-models)
7. [UI Component Data Flow](#7-ui-component-data-flow)
8. [State & Persistence](#8-state--persistence)
9. [Common Change Recipes](#9-common-change-recipes)

---

## 1. Architecture at a Glance

```
User types prompt → TaskEditorModal
                         │
                    HomeComponent
                         │
              ┌──────────┴──────────┐
              │                     │
    IntentStreamService      BrowserUseService
    (POST SSE to :8001)      (POST + WS to :8000/:7000)
              │                     │
       IntentChunk[]          BrowserStep[]
              │                     │
              └──────────┬──────────┘
                         │
              TaskExecutionPanelComponent
              (live UI: ticker → params → step feed)
                         │
                    TaskService
                    (signals + localStorage)
                         │
                    TaskCardComponent
                    (last-run badge on card)
```

There are **two** backend services that run sequentially for every task execution:

1. **Intent Stream** — A POST/SSE service that reads the prompt and returns a streaming analysis of what the user wants to do. Runs first, shows results in the left panel column.
2. **Browser-Use** — An HTTP POST that starts a browser agent, then a WebSocket that streams each browser step in real time. Runs second, shows results in the right panel column.

---

## 2. Switching Between Mock and Real Services

**File:** `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  useMockServices: true,          // ← flip this

  intentApiBaseUrl: 'http://localhost:8001',   // Intent Stream backend
  browserApiUrl:    'http://107.109.40.71:8000', // Browser-Use HTTP backend
  browserWsUrl:     'ws://localhost:7000',      // Browser-Use WebSocket backend
};
```

| `useMockServices` | Services used | Backend required |
|---|---|---|
| `true` (default) | `MockIntentStreamService`, `MockBrowserUseService` | None — data is simulated |
| `false` | `RealIntentStreamService`, `RealBrowserAutomationService` | Both backends must be running |

The swap happens in `src/main.ts`:

```typescript
{
  provide: INTENT_STREAM_SERVICE,
  useClass: environment.useMockServices ? MockIntentStreamService : RealIntentStreamService,
},
{
  provide: BROWSER_USE_SERVICE,
  useClass: environment.useMockServices ? MockBrowserUseService : RealBrowserAutomationService,
},
```

**To point to a different backend:** Only change the URL values in `environment.ts`. Never hardcode URLs inside service files.

**To add a new environment (e.g. staging):** Copy `environment.ts` to `environment.staging.ts` and update the `fileReplacements` in `angular.json`.

---

## 3. Intent Stream API

### What it does
Analyses the user's natural language prompt and returns:
- A stream of progress events (shown one at a time in the left panel ticker)
- A final structured result with detected intent, reasoning, confidence, and a final response

### Endpoint
```
POST http://localhost:8001/api/execute/stream
Content-Type: application/json

Body: { "query": "<user prompt>" }
```

### Protocol: POST-based Server-Sent Events (SSE)

The response body is a stream of SSE-formatted text. Unlike standard SSE (which uses GET), this endpoint requires POST — so the native browser `EventSource` API cannot be used. The service uses `fetch()` with a streaming reader instead.

**SSE format of each progress event:**
```
event: intent_detection_started
data: {"message": "Detecting intent…"}

event: model_selected
data: {"message": "Model selected. Analyzing request…", "model": "gpt-4o"}

event: intent_detected
data: {"message": "Intent identified. Building execution plan…", "confidence": 0.95}

event: step_started
data: {"message": "Executing step 1"}

event: execution_completed
data: {"message": "Done.", "duration_human": "2.3s"}
```

Each progress event has both an `event:` line and a `data:` line. Known event types:
`intent_detection_started`, `model_selected`, `intent_detected`, `step_started`, `api_call_started`, `api_call_completed`, `execution_completed`

**Final response** (last message, no `event:` line — just `data:`):
```
data: {
  "query": "...",
  "detected_intent": "Web Browsing Automation",
  "reasoning": "The user wants to scrape...",
  "confidence": 0.95,
  "steps_executed": 5,
  "final_response": "## Summary\n\nI will...",
  "intent_model_name": "gpt-4o-mini",
  "final_model_name": "gpt-4o",
  "success": true
}
```

The service distinguishes final from progress by checking whether `currentEventType` is set when a `data:` line arrives. If no `event:` preceded the `data:`, it is the final message.

### Service file
`src/app/core/services/intent-stream.service.ts`

**`streamIntent(prompt: string): Observable<IntentChunk>`**

The real implementation:
1. Creates an `AbortController` (used by `cancelStream()` to abort mid-stream)
2. Calls `fetch(POST, /api/execute/stream, { query: prompt })`
3. Gets a `ReadableStream` reader from `response.body`
4. Reads chunks, appends to a string buffer, splits on `\n`
5. For each line:
   - `event: X` → stores X as `currentEventType`
   - `data: {...}` → if `currentEventType` is set: emits `{ done: false, token: data.message, eventType }`. If no `currentEventType`: it's the final message, emits `{ done: true, finalResult }` and completes
   - blank line → SSE boundary, ignored

**`cancelStream()`** calls `abortController.abort()`. The `AbortError` is caught and treated as a normal completion (not an error).

### Mock delay control
`src/app/core/services/intent-stream.service.ts` — top of file:

```typescript
export const MOCK_INTENT_STREAM_DELAY_MS = 600;
```

Change this number to adjust how fast mock events fire. Only affects `useMockServices: true` mode.

### What the UI does with each chunk

In `TaskExecutionPanelComponent.streamIntent()`:

```
chunk.done === false  →  currentEventLabel.set(chunk.token)
                          (shown in the animated ticker in the left column)

chunk.done === true   →  intentComplete.set(true)
                          parseIntentParams(chunk.finalResult)
                          startExecution()   ← triggers Phase 2
```

---

## 4. Browser-Use API (HTTP + WebSocket)

### What it does
Launches a browser agent that executes the task step by step. Each step is streamed via WebSocket as the agent works.

### Phase A — Start the task (HTTP POST)

```
POST http://107.109.40.71:8000/run
Content-Type: application/json

Body: { "task": "<user prompt>" }
```

**Response:**
```json
{
  "status": "started",
  "task_id": "abc123",
  "task": "Scrape top 50 wireless earbuds...",
  "websocket_url": "/ws/task/abc123"
}
```

The `websocket_url` is a path (always starts with `/`). The full WebSocket URL is constructed as:
```
ws://localhost:7000 + /ws/task/abc123
→ ws://localhost:7000/ws/task/abc123
```

Note: `browserApiUrl` (HTTP) and `browserWsUrl` (WebSocket) can point to different hosts/ports — as they do here (`107.109.40.71:8000` vs `localhost:7000`).

### Phase B — Stream step updates (WebSocket)

Once connected, the backend sends JSON frames as the agent works:

```json
{
  "task_id": "abc123",
  "event": "step",
  "message": "Navigated to Amazon.in",
  "timestamp": "2026-05-09T10:30:00.123Z",
  "step": 3,
  "actions": ["click #search-input", "type 'wireless earbuds'"],
  "thoughts": "I need to search for the product on Amazon",
  "errors": [],
  "results": ["Page loaded successfully"],
  "current_url": "https://amazon.in/s?k=wireless+earbuds",
  "screenshot": "<base64 string or null>"
}
```

Key fields:
| Field | Purpose |
|---|---|
| `step` | Step number (1-based). Frames without `step` are ignored. |
| `thoughts` | AI reasoning — used as the step title |
| `message` | Fallback title if `thoughts` is absent |
| `actions` | List of browser actions taken — shown in step detail |
| `results` | Outcomes of actions — shown in step detail |
| `errors` | Non-empty array → step status becomes `error` |
| `current_url` | Current browser URL at time of step |
| `screenshot` | Base64 image (optional) |

When the WebSocket closes (`ws.onclose`), the service emits a final synthetic step `{ stepNumber: 0, status: 'completed' }` and calls `observer.complete()`. The `stepNumber: 0` signals the panel to finalize (it skips adding it to the step list but uses its `resultMarkdown` and `hasFiles` flags if present).

### Service file
`src/app/core/services/browser-use.service.ts`

**`startTask(taskId, prompt, config): Observable<BrowserStep>`**

1. POSTs to `${environment.browserApiUrl}/run`
2. On success: constructs the WebSocket URL and opens a connection
3. On each `ws.onmessage`: parses JSON, calls `mapToStep(msg)`, emits the resulting `BrowserStep`
4. On `ws.onclose`: emits the completion step and completes the Observable
5. The Observable teardown function (returned from the constructor) closes the WebSocket if the consumer unsubscribes

**`stopTask(taskId)`** — closes the WebSocket for that task.

**`fetchFiles(taskId)`** — opens `${environment.browserApiUrl}/files/${taskId}` in a new browser tab.

**`mapToStep(msg)`** — translates the raw WS message to a `BrowserStep`:
- Returns `null` if `msg.step` is absent (frame is discarded)
- Title = `msg.thoughts ?? msg.message ?? "Step N"` (truncated to 80 chars)
- Detail = `actions` + `results` joined with ` · ` (truncated to 120 chars)
- Status = `'error'` if `msg.errors.length > 0`, otherwise `'completed'`

---

## 5. Angular Dependency Injection Tokens

Because the app supports both mock and real backends, services are not injected directly by class. Instead, two `InjectionToken`s are used:

**File:** `src/app/core/tokens/service.tokens.ts`

```typescript
export const INTENT_STREAM_SERVICE = new InjectionToken<IntentStreamService>('INTENT_STREAM_SERVICE');
export const BROWSER_USE_SERVICE   = new InjectionToken<BrowserUseService>('BROWSER_USE_SERVICE');
```

**In the execution panel component:**
```typescript
private intentService  = inject(INTENT_STREAM_SERVICE);
private browserService = inject(BROWSER_USE_SERVICE);
```

**Providers registered in `src/main.ts`** (at app bootstrap):
```typescript
{
  provide: INTENT_STREAM_SERVICE,
  useClass: environment.useMockServices ? MockIntentStreamService : RealIntentStreamService,
},
{
  provide: BROWSER_USE_SERVICE,
  useClass: environment.useMockServices ? MockBrowserUseService : RealBrowserAutomationService,
},
```

**What this means for changes:**
- Adding a new backend? Create a new class that extends `IntentStreamService` or `BrowserUseService`, then update `main.ts` to use it.
- Changing the real service behavior? Edit `RealIntentStreamService` or `RealBrowserAutomationService`. The component code never needs to change.
- Both abstract base classes define the interface (method signatures) that all implementations must satisfy.

---

## 6. Data Models

### `IntentChunk` — emitted by `streamIntent()`
```typescript
interface IntentChunk {
  token: string;          // progress message text (empty for final)
  done: boolean;          // false = progress event, true = final result
  eventType?: string;     // SSE event type (e.g. 'model_selected')
  finalResult?: IntentFinalResult;
}
```

### `IntentFinalResult` — the parsed final API response
```typescript
interface IntentFinalResult {
  query: string;           // original prompt echo
  detectedIntent: string;  // e.g. 'Web Browsing Automation'
  reasoning: string;       // AI explanation (shown in Task Parameters > Query)
  confidence: number;      // 0–1 (shown as % in Task Parameters > Confidence)
  stepsExecuted: number;
  finalResponse: string;   // markdown (rendered in left panel)
  intentModelName: string; // model used for intent detection
  finalModelName: string;  // model used for final answer (shown in Task Parameters > Output)
  success: boolean;
}
```

### `BrowserStep` — emitted by `startTask()`
```typescript
interface BrowserStep {
  stepNumber: number;    // 0 = completion sentinel; 1+ = real steps
  title: string;         // truncated thoughts or message
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;       // actions + results combined
  timestamp?: string;    // HH:MM:SS
  errorMessage?: string; // joined errors[]
  resultMarkdown?: string; // final markdown (only on the sentinel step 0)
  hasFiles?: boolean;    // whether files are available to download
  screenshot?: string;   // base64
  thoughts?: string;     // raw AI thoughts
  currentUrl?: string;   // browser URL
}
```

### `TaskRun` — one execution record, stored in localStorage
```typescript
interface TaskRun {
  id: string;              // e.g. "run-task-123-1715234567890"
  taskId: string;
  status: 'running' | 'completed' | 'stopped' | 'error';
  startedAt: string;       // ISO timestamp
  completedAt?: string;
  totalSteps: number;
  completedSteps: number;
  resultMarkdown?: string;
  hasFiles: boolean;
}
```

### `Task` — the user-defined automation task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  prompt: string;          // ← this is sent to both APIs
  category: TaskCategory;
  scheduler: { type: 'none' | 'daily' | 'weekly' | 'custom'; cron?: string };
  configuration: { mode: 'headed' | 'headless' }; // sent to browser-use service
  status: 'active' | 'idle' | 'running' | 'stopped' | 'error';
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. UI Component Data Flow

### Full execution sequence

```
1. User clicks Run/Test on a TaskCard or from the editor modal
       ↓
2. HomeComponent.onRunTask(taskId) / onSaveAndRun(payload)
       ↓
3. HomeComponent.startExecution(task, isTest)
   - Creates a TaskRun record with status='running'
   - Calls TaskService.addRun(run) → saved to localStorage
   - Calls TaskService.setStatus(task.id, 'running')
   - Sets activeExecution signal → causes TaskExecutionPanelComponent to mount
       ↓
4. TaskExecutionPanelComponent.ngOnInit()
   - Starts the elapsed timer
   - Calls streamIntent(prompt)
       ↓
5. [PHASE 1 — Intent] IntentStreamService.streamIntent(prompt)
   Each IntentChunk.done===false:
     → currentEventLabel updated → ticker in left panel animates
   Final chunk (done===true):
     → intentComplete = true (ticker hides, params table appears)
     → intentFinalHtml rendered (markdown in left panel)
     → intentParams populated (Target / Action / Query / Output / Confidence)
     → startExecution() called (Phase 2 begins)
       ↓
6. [PHASE 2 — Browser] BrowserUseService.startTask(taskId, prompt, config)
   Each BrowserStep received:
     → steps signal updated (adds/updates step in feed)
     → step feed auto-scrolls to bottom
     → if stepNumber===0: resultMarkdown/hasFiles captured (completion sentinel)
   Observable.complete():
     → executionStatus = 'completed'
     → timer stops
     → complete.emit(ExecutionCompleteEvent)
       ↓
7. HomeComponent.onExecutionComplete(result)
   - TaskService.setStatus(task.id, 'idle')
   - TaskService.updateRun({ ...run, status:'completed', completedAt, resultMarkdown, hasFiles, completedSteps })
   - Run saved to localStorage
   - Task card's lastRun badge updates immediately (reactive signal)
```

### Stop / Close sequence

**User clicks Stop:**
```
TaskExecutionPanelComponent.stopExecution()
  → BrowserUseService.stopTask(taskId)   (closes WebSocket)
  → IntentStreamService.cancelStream()   (aborts fetch if still streaming)
  → executionStatus = 'stopped'
  → timer stops
  [panel stays open, showing "Task stopped by user"]
```

**User clicks X (close panel):**
```
TaskExecutionPanelComponent.onClose()
  → stopExecution()
  → close.emit()
       ↓
HomeComponent.onExecutionClose()
  → TaskService.setStatus(task.id, 'idle')
  → If run.status === 'running': updateRun({ status: 'stopped', completedAt })
  → activeExecution.set(null)  → panel unmounts
```

### Component inputs and outputs

**`TaskExecutionPanelComponent`**

| Input | Type | Source | Purpose |
|---|---|---|---|
| `taskId` | `string` | `activeExecution().taskId` | Identifies the task for API calls and run matching |
| `runId` | `string` | `activeExecution().runId` | Identifies the specific run to update in history |
| `prompt` | `string` | `task.prompt` | Sent to both Intent and Browser-Use APIs |
| `taskName` | `string` | `task.title` | Display only — shown in panel header |
| `configuration` | `TaskConfiguration` | `task.configuration` | Passed to `BrowserUseService.startTask()` |

| Output | Payload | Triggers |
|---|---|---|
| `close` | `void` | `HomeComponent.onExecutionClose()` |
| `complete` | `ExecutionCompleteEvent` | `HomeComponent.onExecutionComplete()` |

**`TaskCardComponent`**

| Input | Type | Purpose |
|---|---|---|
| `task` | `Task` | Full task data for display and status |
| `lastRun` | `TaskRun \| null` | Populated by `HomeComponent.lastRunMap()` — drives the last-run status strip |

---

## 8. State & Persistence

### Signals (in-memory, reactive)

| Signal | Lives in | What it holds |
|---|---|---|
| `tasks` | `TaskService` | Array of all tasks — drives the card grid |
| `taskRuns` | `TaskService` | Array of all runs — drives history modal and lastRunMap |
| `modal` | `HomeComponent` | Which modal is open (`none` / `create` / `edit` / `history`) |
| `activeExecution` | `HomeComponent` | The currently running execution, or `null` |
| `steps` | `TaskExecutionPanelComponent` | Steps received so far in this execution |
| `executionStatus` | `TaskExecutionPanelComponent` | `intent` → `executing` → `completed` / `stopped` / `error` |

### localStorage (persistent)

| Key | Content |
|---|---|
| `omniact_tasks` | JSON array of `Task` objects |
| `omniact_task_runs` | JSON array of `TaskRun` objects (newest first) |

Managed entirely by `StorageService`. Every signal mutation in `TaskService` also calls the corresponding `StorageService` method to keep localStorage in sync.

On first load with no localStorage data, `StorageService.seedTasks()` creates three demo tasks.

---

## 9. Common Change Recipes

### Change a backend URL
Edit only `src/environments/environment.ts`. All three keys:
- `intentApiBaseUrl` — base URL for the Intent Stream POST (no trailing slash)
- `browserApiUrl` — base URL for the Browser-Use HTTP POST and file download
- `browserWsUrl` — base URL for the WebSocket connection (use `ws://` or `wss://`)

### Add a new field from the Intent API to the UI
1. Add the field to `IntentFinalResult` in `src/app/core/models/intent-result.model.ts`
2. Map it from the raw response in `mapFinalResult()` at the bottom of `intent-stream.service.ts`
3. Add it to `intentParams` in `parseIntentParams()` in `task-execution-panel.component.ts`
4. Add the field to `IntentResult` interface if it needs to be stored there
5. Display it in `task-execution-panel.component.html` inside the `.intent__params` block

### Add a new field from the WebSocket to the UI
1. Add the field to `WsStepMessage` interface in `browser-use.service.ts`
2. Map it in `mapToStep()` in the same file
3. Add it to `BrowserStep` in `src/app/core/models/browser-step.model.ts`
4. Display it in the step row in `task-execution-panel.component.html`

### Change what is stored in run history
Edit `TaskRun` in `src/app/core/models/task-run.model.ts`, then update:
- `HomeComponent.startExecution()` — initial run creation
- `HomeComponent.onExecutionComplete()` — final run update
- `HomeComponent.onExecutionClose()` / `onStopTask()` — stopped run update
- `TaskHistoryModalComponent` — if history display needs to show the new field

### Add a new mock browser step
In `browser-use.service.ts`, `MockBrowserUseService.mockSteps[]` — add an entry to the array. The mock service iterates through this list sequentially with randomized delays.

### Replace the Intent API with a different protocol (e.g. standard GET SSE)
1. Rewrite only `RealIntentStreamService.streamIntent()` in `intent-stream.service.ts`
2. The method must return `Observable<IntentChunk>` — the component is not affected
3. If the new API uses `EventSource`, remove the `fetch()` + reader loop and use `new EventSource(url)` instead

### Run without any backend (full mock mode)
Set `useMockServices: true` in `environment.ts`. No other changes needed — the DI system handles everything.
