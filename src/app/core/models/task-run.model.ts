export type TaskRunStatus = 'running' | 'completed' | 'stopped' | 'error';

export interface TaskRun {
  id: string;
  taskId: string;
  status: TaskRunStatus;
  startedAt: string;
  completedAt?: string;
  totalSteps: number;
  completedSteps: number;
  resultMarkdown?: string;
  hasFiles: boolean;
}
