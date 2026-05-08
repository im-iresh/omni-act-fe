import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { TaskTemplate, TaskTemplateForm } from '../models/task-template.model';

@Injectable({ providedIn: 'root' })
export class TaskTemplateService {
  private storage = inject(StorageService);

  templates = signal<TaskTemplate[]>(this.storage.getTemplates());

  create(form: TaskTemplateForm): TaskTemplate {
    const now = new Date().toISOString();
    const tpl: TaskTemplate = {
      ...form,
      id: `tpl-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.saveTemplate(tpl);
    this.templates.set(this.storage.getTemplates());
    return tpl;
  }

  update(id: string, form: TaskTemplateForm): void {
    const existing = this.templates().find(t => t.id === id);
    if (!existing) return;
    const updated: TaskTemplate = {
      ...existing,
      ...form,
      updatedAt: new Date().toISOString(),
    };
    this.storage.saveTemplate(updated);
    this.templates.set(this.storage.getTemplates());
  }

  delete(id: string): void {
    this.storage.deleteTemplate(id);
    this.templates.set(this.storage.getTemplates());
  }

  duplicate(id: string): void {
    this.storage.duplicateTemplate(id);
    this.templates.set(this.storage.getTemplates());
  }

  getById(id: string): TaskTemplate | undefined {
    return this.templates().find(t => t.id === id);
  }

  exportJson(): void {
    this.storage.exportTemplatesAsJson();
  }
}
