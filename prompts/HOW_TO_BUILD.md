# OmniAct — Claude Code Setup Guide
### Using Claude Code in VSCode Chat Mode

---

## Before you start — install Claude Code

1. Open VSCode
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search **Claude Code** and install it
4. Sign in with your Anthropic account when prompted
5. You should see a Claude icon in the left sidebar and a chat panel available

---

## Folder setup

Create an empty folder anywhere on your machine and open it in VSCode:

```bash
mkdir omniact
cd omniact
code .
```

Copy **all 6 prompt files** into this folder so they sit alongside the project:

```
omniact/               ← your VSCode workspace root
├── CLAUDE.md
└── prompts/
    ├── 01-scaffold.md
    ├── 02-core.md
    ├── 03-home.md
    ├── 04-execution.md
    └── 05-polish.md
```

---

## How to talk to Claude Code in VSCode chat mode

Open the Claude Code chat panel:
- Click the Claude icon in the left sidebar, **or**
- Use the keyboard shortcut shown after installation (usually `Ctrl+Shift+P` → "Claude: Open Chat")

Every message below is something you type into that chat panel.
The `---` lines are just separators between steps — do not type them.

---

## Phase 1 — Scaffold

Paste this as your first message:

```
Read the file CLAUDE.md in this workspace. That is the master context for this project. 
Acknowledge the project name, stack, and the 10 absolute rules before we begin.
```

Wait for Claude to confirm it has read and understood the file.

Then paste:

```
Now read prompts/01-scaffold.md and execute every step in it exactly as written.
Create the Angular project, folder structure, all SCSS partials, and the Material theme.
Tell me when each major step completes and stop if you hit any error.
```

Wait. Claude will run shell commands and create files. When it says it is done, verify:

```
Run ng serve and confirm the app starts with no errors. 
Show me the terminal output.
```

---

## Phase 2 — Core models, services, shared components

```
Read prompts/02-core.md and implement everything in it.
Work in this order:
1. All model files under src/app/core/models/
2. StorageService
3. TaskTemplateService and TaskHistoryService
4. IntentStreamService and BrowserUseService (mock implementations)
5. TypewriterComponent
6. StatusBadgeComponent
7. NavbarComponent
Tell me when each file is created and confirm it compiles before moving to the next.
```

When done:

```
Run ng build --configuration development and show me the output. 
Fix any TypeScript errors before we continue.
```

---

## Phase 3 — Home page, cards, modals

```
Read prompts/03-home.md and implement everything in it.
Work in this order:
1. Delete any existing add-task-tile component if present
2. TemplateCardComponent (template-card/)
3. TaskCardComponent (task-card/)
4. NewTaskModalComponent (new-task-modal/)
5. TemplateEditorModalComponent (template-editor-modal/)
6. HomeComponent — wire all of the above together
7. Update AppComponent
Tell me after each component is done. Stop and ask me if any file would exceed 300 lines.
```

When done:

```
Run ng serve. Open the browser and confirm:
- Three sections render: Templates, Active tasks, History
- Template cards show with Edit / Run / Duplicate / Delete actions
- Clicking "New task" button opens the dark modal overlay
- Clicking "New template" opens the purple editor modal
- History section collapses when the toggle is clicked
Show me any console errors.
```

---

## Phase 4 — Execution panel

```
Read prompts/04-execution.md and implement the TaskExecutionPanelComponent.
This component goes in src/app/features/home/components/task-execution-panel/.
It is already imported by HomeComponent from Phase 3 so it just needs to be created.
Implement in this order:
1. task-execution-panel.component.ts
2. task-execution-panel.component.html
3. task-execution-panel.component.scss
Confirm it compiles before finishing.
```

When done:

```
Run ng serve. Click "Run" on a template card and confirm:
- The execution panel opens as a centered overlay
- The intent text streams in with a typewriter effect on the left
- Browser steps appear one by one on the right feed
- The progress bar increments
- The elapsed timer ticks
- Clicking Stop or the backdrop closes the panel
Show me any errors.
```

---

## Phase 5 — Polish

```
Read prompts/05-polish.md and apply all polish items:
1. Micro-interaction CSS additions (card hover, button pulse, navbar glow)
2. Extract shared modal SCSS partial to styles/_modal.scss
3. Responsive breakpoints in styles.scss
4. Accessibility additions (focus ring, reduced motion)
5. Empty state for Active tasks section
6. Error snackbar setup
Do these one section at a time and confirm each compiles.
```

When done:

```
Run ng build --configuration production and show me the full output.
Fix any errors or warnings until the build is clean.
```

---

## If Claude makes a mistake

If a file has wrong content or a bug, be specific:

```
The file src/app/features/home/components/task-card/task-card.component.ts 
has a TypeScript error on line 34. Here is the error: [paste error].
Fix only that file, do not touch anything else.
```

If Claude drifts from the design:

```
Re-read CLAUDE.md rule #3 — no inline styles.
Re-read prompts/03-home.md section 3.5 for the exact modal colors.
Now fix [component name] to match.
```

---

## Switching to a real backend later

When you are ready to connect to your actual API instead of mocks:

```
Read the "Real Backend Integration Guide" section in prompts/05-polish.md 
and implement the RealIntentStreamService and RealBrowserUseService.
Then update src/environments/environment.ts to set useMockServices: false
and confirm the build still compiles.
```

---

## Quick reference — what each file builds

| File | Run when |
|---|---|
| `CLAUDE.md` | Start of every session — always load this first |
| `prompts/01-scaffold.md` | Fresh project setup |
| `prompts/02-core.md` | After scaffold is confirmed |
| `prompts/03-home.md` | After core compiles cleanly |
| `prompts/04-execution.md` | After home renders correctly |
| `prompts/05-polish.md` | After execution panel works |
