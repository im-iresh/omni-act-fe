# OmniAct

> **Describe a task. OmniAct handles the rest.**

AI-powered autonomous browser agent UI. Users submit natural language prompts; the system streams intent recognition in real-time, then executes tasks via a browser-use backend showing live stepwise updates.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 LTS or 20 LTS | https://nodejs.org |
| npm | comes with Node | — |
| Angular CLI | 20.x | `npm install -g @angular/cli` |

Verify your setup:

```bash
node -v
npm -v
ng version
```

---

## Getting started on a new machine

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd omniact-fe

# 2. Install dependencies
npm install

# 3. Start the dev server
ng serve
```

Open `http://localhost:4200` in your browser. The app hot-reloads on every file save.

---

## Project structure

```
src/
├── app/
│   ├── app.ts                        # Root standalone component
│   ├── core/
│   │   ├── models/                   # TypeScript interfaces (task, template, step…)
│   │   └── services/                 # Mock + real service implementations
│   ├── features/
│   │   └── home/                     # Main page + all sub-components
│   │       └── components/
│   │           ├── template-card/
│   │           ├── task-card/
│   │           ├── new-task-modal/
│   │           ├── template-editor-modal/
│   │           └── task-execution-panel/
│   └── shared/
│       └── components/               # Navbar, TypewriterComponent, StatusBadge…
├── environments/
│   ├── environment.ts                # Dev config  (useMockServices: true)
│   └── environment.production.ts    # Prod config (useMockServices: false)
├── styles/
│   ├── _variables.scss               # All CSS custom properties
│   ├── _animations.scss              # Keyframe animations
│   ├── _modal.scss                   # Shared modal overlay / close-button styles
│   ├── _typography.scss
│   └── _material-overrides.scss     # Angular Material dark-theme overrides
└── styles.scss                       # Global entry — imports all partials
```

---

## Environment configuration

| File | Used when | Mock services |
|------|-----------|---------------|
| `src/environments/environment.ts` | `ng serve` / `ng build --configuration development` | **on** |
| `src/environments/environment.production.ts` | `ng build --configuration production` | **off** |

To point the dev build at a real backend, edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  useMockServices: false,       // ← flip to false
  apiBaseUrl: 'http://localhost:8000',   // ← your backend URL
};
```

---

## Available commands

```bash
# Development server (with hot reload)
ng serve

# Development build (unminified, source maps on)
ng build --configuration development

# Production build (minified, tree-shaken, hashed filenames)
ng build --configuration production

# Run unit tests (Karma)
ng test
```

Build output goes to `dist/omniact/`.

---

## Connecting a real backend

The app ships with mock services that simulate intent streaming and browser-use step execution entirely in the browser. When you are ready to wire up a real backend:

1. Set `useMockServices: false` in the relevant environment file.
2. Implement the two real service classes (stubs provided in `src/app/core/services/`):
   - `RealIntentStreamService` — consumes a Server-Sent Events endpoint at `/api/intent/stream`
   - `RealBrowserUseService` — POSTs to `/api/tasks/start` and polls `/api/tasks/:id/latest-step`
3. Register them via Angular DI in `src/main.ts` using the `environment.useMockServices` flag.

See `prompts/05-polish.md` § 5.6 for the full provider-swap pattern.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Angular 20 (standalone components, signals) |
| UI library | Angular Material 20 (custom dark theme) |
| Styling | SCSS + CSS custom properties |
| Animations | `@angular/animations` |
| Fonts | Space Grotesk + JetBrains Mono (Google Fonts) |
| Icons | Material Symbols Outlined |
| State | Component signals + RxJS Observables |
| Storage | `localStorage` (templates + task history persist across reloads) |
