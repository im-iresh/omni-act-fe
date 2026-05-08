import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { TaskHistoryEntry } from '../models/task-history.model';

@Injectable({ providedIn: 'root' })
export class TaskHistoryService {
  private storage = inject(StorageService);

  entries = signal<TaskHistoryEntry[]>(this.storage.getHistory());

  add(entry: TaskHistoryEntry): void {
    this.storage.saveHistoryEntry(entry);
    this.entries.set(this.storage.getHistory());
  }

  update(updated: TaskHistoryEntry): void {
    this.storage.saveHistoryEntry(updated);
    this.entries.set(this.storage.getHistory());
  }

  delete(id: string): void {
    this.storage.deleteHistoryEntry(id);
    this.entries.set(this.storage.getHistory());
  }

  getRunning(): TaskHistoryEntry[] {
    return this.entries().filter(e => e.status === 'running');
  }

  getCompleted(): TaskHistoryEntry[] {
    return this.entries().filter(
      e => e.status === 'completed' || e.status === 'stopped' || e.status === 'error'
    );
  }

  historyToTemplate(entry: TaskHistoryEntry): Omit<TaskHistoryEntry, 'id'> & { suggestedName: string } {
    return { ...entry, suggestedName: entry.name };
  }
}
