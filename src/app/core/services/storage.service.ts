import { Injectable } from '@angular/core';
import { TaskTemplate } from '../models/task-template.model';
import { TaskHistoryEntry } from '../models/task-history.model';

const KEYS = {
  TEMPLATES: 'omniact_templates',
  HISTORY:   'omniact_history',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {

  // ── Templates ──────────────────────────────────────────────────────────────

  getTemplates(): TaskTemplate[] {
    try {
      const raw = localStorage.getItem(KEYS.TEMPLATES);
      return raw ? (JSON.parse(raw) as TaskTemplate[]) : this.seedTemplates();
    } catch {
      return this.seedTemplates();
    }
  }

  saveTemplate(template: TaskTemplate): void {
    const all = this.getTemplates();
    const idx = all.findIndex(t => t.id === template.id);
    if (idx >= 0) { all[idx] = template; } else { all.push(template); }
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(all));
  }

  deleteTemplate(id: string): void {
    const filtered = this.getTemplates().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(filtered));
  }

  duplicateTemplate(id: string): TaskTemplate | null {
    const original = this.getTemplates().find(t => t.id === id);
    if (!original) return null;
    const copy: TaskTemplate = {
      ...original,
      id: `tpl-${Date.now()}`,
      name: `${original.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveTemplate(copy);
    return copy;
  }

  // ── History ────────────────────────────────────────────────────────────────

  getHistory(): TaskHistoryEntry[] {
    try {
      const raw = localStorage.getItem(KEYS.HISTORY);
      return raw ? (JSON.parse(raw) as TaskHistoryEntry[]) : [];
    } catch {
      return [];
    }
  }

  saveHistoryEntry(entry: TaskHistoryEntry): void {
    const all = this.getHistory();
    const idx = all.findIndex(h => h.id === entry.id);
    if (idx >= 0) { all[idx] = entry; } else { all.unshift(entry); }
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(all));
  }

  deleteHistoryEntry(id: string): void {
    const filtered = this.getHistory().filter(h => h.id !== id);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  exportTemplatesAsJson(): void {
    const data = JSON.stringify(this.getTemplates(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniact_templates_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importTemplatesFromJson(jsonString: string): void {
    const imported = JSON.parse(jsonString) as TaskTemplate[];
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(imported));
  }

  // ── Seed data ──────────────────────────────────────────────────────────────

  private seedTemplates(): TaskTemplate[] {
    const now = new Date().toISOString();
    const seeds: TaskTemplate[] = [
      {
        id: 'tpl-amazon-scout',
        name: 'Amazon Scout',
        subtitle: 'Product data miner',
        iconName: 'shopping_cart',
        accentColor: '--color-accent',
        defaultPrompt: 'Scrape top 50 wireless earbuds under ₹2000 from Amazon.in with prices, ratings, and reviews. Export as JSON.',
        status: 'active',
        tags: ['ecommerce', 'scraping'],
        illustrationType: 'browser-scrape',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-linkedin-harvester',
        name: 'LinkedIn Harvester',
        subtitle: 'Profile & lead extractor',
        iconName: 'people',
        accentColor: '--color-purple',
        defaultPrompt: 'Find all software engineers in Bangalore with 3-5 years experience on LinkedIn and export their profiles.',
        status: 'idle',
        tags: ['social', 'lead-gen'],
        illustrationType: 'social-orbit',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tpl-price-tracker',
        name: 'Price Tracker',
        subtitle: 'E-commerce monitor',
        iconName: 'trending_down',
        accentColor: '--color-idle',
        defaultPrompt: 'Monitor the price of iPhone 15 128GB on Flipkart daily and alert when it drops below ₹55,000.',
        status: 'idle',
        tags: ['ecommerce', 'monitoring'],
        illustrationType: 'custom',
        createdAt: now,
        updatedAt: now,
      },
    ];
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(seeds));
    return seeds;
  }
}
