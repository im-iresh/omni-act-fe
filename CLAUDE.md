# OmniAct — Claude Code Master Prompt

> **How to use this file**: This is your single source of truth for building OmniAct.
> Feed it to Claude Code at the start of every session with:
> `claude --context CLAUDE.md`
> Individual phase files in `prompts/` break the work into focused passes.
> Always run phases in order. Never skip a phase.

---

## Project Identity

- **Name**: OmniAct
- **Tagline**: "Describe a task. OmniAct handles the rest."
- **Type**: Angular 17+ single-page application
- **Purpose**: AI-powered autonomous browser agent UI. Users submit natural language prompts; the system streams intent recognition in real-time, then executes tasks via a browser-use backend showing live stepwise updates.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Angular 17+ (standalone components, signals) |
| UI Library | Angular Material 17+ (custom dark theme) |
| Styling | SCSS + CSS custom properties |
| Animations | `@angular/animations` |
| Fonts | Space Grotesk (headings/body) + JetBrains Mono (logs) via Google Fonts |
| Icons | Material Symbols (outlined) |
| State | Component-level signals + RxJS Observables |
| HTTP/Stream | `HttpClient` for REST, native `EventSource` for SSE |

---

## Prompts Execution Order

| File | Phase | What it builds |
|---|---|---|
| `prompts/01-scaffold.md` | 1 — Scaffold | Angular project, folder structure, theme, global styles |
| `prompts/02-core.md` | 2 — Core | Models, services (with mocks), shared components |
| `prompts/03-home.md` | 3 — Home | Home page, Templates section, Active Tasks section, History section, modals |
| `prompts/04-execution.md` | 4 — Execution Panel | Expanded task panel, intent stream, step feed |
| `prompts/05-polish.md` | 5 — Polish | Animations, responsiveness, micro-interactions |

---

## Absolute Rules for Claude Code

1. **Never use `<form>` HTML tags.** Use `FormControl` / `FormGroup` directly on inputs with Angular reactive forms.
2. **All new components are standalone** (`standalone: true`). No NgModules except `AppModule` bootstrap.
3. **No inline styles.** All styles go in the component's `.scss` file or `styles.scss`.
4. **All colors via CSS variables** defined in `:root {}` in `styles.scss`. Never hardcode hex values inside component SCSS.
5. **Mock services are the default.** Every service must have a `MockXxxService` that implements the same interface. Real services are opt-in via Angular DI tokens.
6. **Strictly typed.** No `any`. Use the models defined in `prompts/02-core.md`.
7. **Auto-scroll step feed** using `@ViewChild` + `nativeElement.scrollTop`. Never use `setTimeout` hacks for this.
8. **Unsubscribe all Observables** in `ngOnDestroy` using a `destroy$` Subject + `takeUntil`.
9. **Accessibility**: All interactive elements must have `aria-label`. Status badges must use `role="status"`.
10. **File length cap**: If a generated file exceeds 300 lines, split it. Ask before proceeding.
