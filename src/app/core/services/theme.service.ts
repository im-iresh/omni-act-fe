import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'omniact_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'dark' | 'light'>(
    (localStorage.getItem(STORAGE_KEY) as 'dark' | 'light') ?? 'dark'
  );

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    this.applyTheme(next);
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}
