export type TaskHistoryStatus = 'running' | 'completed' | 'stopped' | 'error';

export interface TaskHistoryEntry {
  id: string;
  name: string;
  prompt: string;
  status: TaskHistoryStatus;
  startedAt: string;
  completedAt?: string;
  resultSummary?: string;
  totalSteps: number;
  completedSteps: number;
  templateId?: string;
}
