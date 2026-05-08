# Phase 1 — Project Scaffold

> **Claude Code instruction**: Complete every step in this file before moving to `02-core.md`.
> After each shell command, confirm success before proceeding.

---

## 1.1 Create the Angular Project

```bash
ng new omniact \
  --routing=true \
  --style=scss \
  --strict=true \
  --standalone=false \
  --ssr=false
cd omniact
```

---

## 1.2 Install Dependencies

```bash
# Angular Material (dark theme support)
ng add @angular/material

# When prompted:
# - Theme: Custom
# - Typography: Yes
# - Animations: Yes

# Google Fonts (add manually to index.html — see 1.5)
```

---

## 1.3 Folder Structure

Create the following directory tree exactly. Use `mkdir -p` for all paths:

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   └── tokens/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── navbar/
│   │   │   ├── typewriter/
│   │   │   └── status-badge/
│   │   └── pipes/
│   └── features/
│       └── home/
│           ├── components/
│           │   ├── task-tile/
│           │   ├── add-task-tile/
│           │   └── task-execution-panel/
│           └── home.component.ts
├── assets/
│   └── icons/
└── styles/
    ├── _variables.scss
    ├── _animations.scss
    ├── _material-overrides.scss
    └── _typography.scss
```

---

## 1.4 Global Styles — `styles.scss`

Replace the generated `styles.scss` entirely with the following:

```scss
@use '@angular/material' as mat;
@use 'styles/variables' as *;
@use 'styles/typography';
@use 'styles/animations';
@use 'styles/material-overrides';

// ─── Reset ───────────────────────────────────────────────────────────────────
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  overflow-x: hidden;
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

// ─── Scrollbar ────────────────────────────────────────────────────────────────
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-accent) transparent;
}
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--color-accent);
  border-radius: 2px;
  opacity: 0.5;
}

// ─── Page background with cityscape overlay ──────────────────────────────────
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(124, 58, 237, 0.05) 0%, transparent 60%),
    linear-gradient(180deg, #050a15 0%, #0a0e1a 100%);
  z-index: -2;
  pointer-events: none;
}

// ─── Circuit pattern overlay ─────────────────────────────────────────────────
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2300d4ff' stroke-width='0.3' opacity='0.06'%3E%3Cpath d='M10 10h40M10 30h40M10 50h40M10 10v40M30 10v40M50 10v40'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3Ccircle cx='30' cy='10' r='2'/%3E%3Ccircle cx='50' cy='10' r='2'/%3E%3Ccircle cx='10' cy='30' r='2'/%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3Ccircle cx='50' cy='30' r='2'/%3E%3Ccircle cx='10' cy='50' r='2'/%3E%3Ccircle cx='30' cy='50' r='2'/%3E%3Ccircle cx='50' cy='50' r='2'/%3E%3C/g%3E%3C/svg%3E");
  z-index: -1;
  pointer-events: none;
}
```

---

## 1.5 Variables Partial — `styles/_variables.scss`

```scss
:root {
  // ── Colors ──────────────────────────────────────────────────────────────────
  --color-bg:           #050a15;
  --color-surface:      rgba(255, 255, 255, 0.04);
  --color-surface-hover:rgba(255, 255, 255, 0.07);
  --color-border:       rgba(255, 255, 255, 0.08);
  --color-border-strong:rgba(255, 255, 255, 0.16);

  --color-accent:       #00d4ff;
  --color-accent-dim:   rgba(0, 212, 255, 0.15);
  --color-accent-glow:  rgba(0, 212, 255, 0.35);
  --color-purple:       #7c3aed;
  --color-purple-dim:   rgba(124, 58, 237, 0.15);

  --color-active:       #22c55e;
  --color-active-dim:   rgba(34, 197, 94, 0.15);
  --color-idle:         #eab308;
  --color-idle-dim:     rgba(234, 179, 8, 0.15);
  --color-running:      #00d4ff;
  --color-error:        #ef4444;
  --color-error-dim:    rgba(239, 68, 68, 0.15);

  --color-text:         #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-muted:        #64748b;

  // ── Typography ──────────────────────────────────────────────────────────────
  --font-body:   'Space Grotesk', system-ui, sans-serif;
  --font-mono:   'JetBrains Mono', 'Fira Code', monospace;

  // ── Spacing ─────────────────────────────────────────────────────────────────
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;

  // ── Shadows / Glows ─────────────────────────────────────────────────────────
  --glow-accent:  0 0 12px rgba(0, 212, 255, 0.4), 0 0 24px rgba(0, 212, 255, 0.15);
  --glow-purple:  0 0 12px rgba(124, 58, 237, 0.4);
  --glow-active:  0 0 8px  rgba(34, 197, 94, 0.5);

  // ── Glassmorphism ────────────────────────────────────────────────────────────
  --glass-bg:     rgba(255, 255, 255, 0.04);
  --glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --glass-blur:   backdrop-filter: blur(12px);

  // ── Transitions ─────────────────────────────────────────────────────────────
  --transition-fast:   150ms ease-out;
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow:   500ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 1.6 Typography Partial — `styles/_typography.scss`

```scss
// Import from Google Fonts (also add <link> to index.html)
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-body);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text);
}

h1 { font-size: clamp(28px, 4vw, 42px); }
h2 { font-size: clamp(22px, 3vw, 32px); }
h3 { font-size: clamp(18px, 2.5vw, 24px); }

p, span, li {
  font-family: var(--font-body);
  font-weight: 400;
  line-height: 1.6;
}

.mono {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.5;
}

.text-muted  { color: var(--color-muted); }
.text-accent { color: var(--color-accent); }
.text-secondary { color: var(--color-text-secondary); }
```

---

## 1.7 Animations Partial — `styles/_animations.scss`

```scss
// ── Pulse (for status dots) ───────────────────────────────────────────────────
@keyframes pulse-dot {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%       { transform: scale(1.5); opacity: 0.7; }
}

// ── Shimmer (for running step rows) ──────────────────────────────────────────
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

// ── Glow breathe ─────────────────────────────────────────────────────────────
@keyframes glow-breathe {
  0%, 100% { box-shadow: var(--glow-accent); }
  50%       { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.2); }
}

// ── Typewriter cursor ────────────────────────────────────────────────────────
@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

// ── Slide up (step entry) ────────────────────────────────────────────────────
@keyframes slide-up {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

// ── Star spin (decorative) ────────────────────────────────────────────────────
@keyframes star-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

// ── Utility classes ───────────────────────────────────────────────────────────
.animate-slide-up    { animation: slide-up 150ms ease-out forwards; }
.animate-pulse-dot   { animation: pulse-dot 1.5s ease-in-out infinite; }
.animate-glow-breathe{ animation: glow-breathe 2s ease-in-out infinite; }
```

---

## 1.8 Material Overrides — `styles/_material-overrides.scss`

```scss
// ── Global mat-form-field dark style ─────────────────────────────────────────
.mat-mdc-form-field {
  .mdc-text-field {
    background-color: var(--color-surface) !important;
    border-radius: var(--radius-md) !important;
  }
  .mdc-line-ripple { display: none; }
  .mdc-text-field--outlined .mdc-notched-outline__leading,
  .mdc-text-field--outlined .mdc-notched-outline__notch,
  .mdc-text-field--outlined .mdc-notched-outline__trailing {
    border-color: var(--color-border) !important;
  }
  input, textarea {
    color: var(--color-text) !important;
    font-family: var(--font-body) !important;
    caret-color: var(--color-accent) !important;
  }
  .mat-mdc-form-field-focus-overlay { background: transparent; }
  &.mat-focused .mdc-text-field--outlined .mdc-notched-outline__leading,
  &.mat-focused .mdc-text-field--outlined .mdc-notched-outline__notch,
  &.mat-focused .mdc-text-field--outlined .mdc-notched-outline__trailing {
    border-color: var(--color-accent) !important;
    box-shadow: 0 0 0 1px var(--color-accent);
  }
}

// ── mat-chip ──────────────────────────────────────────────────────────────────
.mat-mdc-chip {
  background-color: var(--color-accent-dim) !important;
  color: var(--color-accent) !important;
  font-family: var(--font-mono) !important;
  font-size: 0.75rem !important;
  border: 1px solid rgba(0, 212, 255, 0.2) !important;
}

// ── mat-progress-bar ─────────────────────────────────────────────────────────
.mat-mdc-progress-bar {
  --mdc-linear-progress-active-indicator-color: var(--color-accent);
  --mdc-linear-progress-track-color: rgba(0, 212, 255, 0.1);
  border-radius: 2px;
}

// ── Buttons ──────────────────────────────────────────────────────────────────
.btn-primary {
  background: linear-gradient(135deg, #00d4ff, #0090b8) !important;
  color: #050a15 !important;
  font-weight: 600 !important;
  font-family: var(--font-body) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--glow-accent) !important;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast) !important;
  &:hover {
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.6) !important;
    transform: translateY(-1px);
  }
}

.btn-ghost {
  background: transparent !important;
  color: var(--color-text-secondary) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-md) !important;
  font-family: var(--font-body) !important;
  transition: border-color var(--transition-fast), color var(--transition-fast) !important;
  &:hover {
    border-color: var(--color-accent) !important;
    color: var(--color-accent) !important;
  }
}

.btn-danger {
  background: var(--color-error-dim) !important;
  color: var(--color-error) !important;
  border: 1px solid rgba(239, 68, 68, 0.3) !important;
  border-radius: var(--radius-md) !important;
  font-family: var(--font-body) !important;
  &:hover { background: rgba(239, 68, 68, 0.25) !important; }
}
```

---

## 1.9 Angular Material Custom Theme — `src/app/app.theme.scss`

```scss
@use '@angular/material' as mat;

$omniact-theme: mat.define-theme((
  color: (
    theme-type: dark,
    primary: mat.$cyan-palette,
    tertiary: mat.$violet-palette,
  ),
  typography: (
    brand-family: 'Space Grotesk',
    plain-family: 'Space Grotesk',
    bold-weight: 700,
    medium-weight: 500,
    regular-weight: 400,
  ),
  density: (scale: -1)
));

html {
  @include mat.all-component-themes($omniact-theme);
}
```

Import this in `styles.scss` at the top:
```scss
@use 'app/app.theme';
```

---

## 1.10 `index.html` — Add Font Links

Inside `<head>`, add before the closing tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
```

Update `<title>` to `OmniAct`.
Update `<body>` background inline style to `background-color: #050a15`.

---

## 1.11 Verification Checklist

Before proceeding to Phase 2, confirm:
- [ ] `ng serve` runs without errors
- [ ] Page background is deep dark navy
- [ ] Circuit grid pattern is faintly visible
- [ ] Space Grotesk font loads in browser DevTools Network tab
- [ ] No Material theme compilation errors in console
