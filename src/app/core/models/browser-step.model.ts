export type StepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface BrowserStep {
  stepNumber: number;
  title: string;
  status: StepStatus;
  detail?: string;
  timestamp?: string;
  errorMessage?: string;
  durationMs?: number;
  resultMarkdown?: string;
  hasFiles?: boolean;
  screenshot?: string;
  thoughts?: string;
  currentUrl?: string;
}

export interface TaskExecution {
  taskId: string;
  prompt: string;
  totalSteps: number;
  completedSteps: number;
  elapsedSeconds: number;
  status: 'intent' | 'executing' | 'completed' | 'stopped' | 'error';
  steps: BrowserStep[];
}
