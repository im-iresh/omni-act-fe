export type TaskCategory =
  | 'bot'
  | 'agent'
  | 'web-automation'
  | 'data-scraping'
  | 'social-media'
  | 'productivity';

export type TaskStatus = 'active' | 'idle' | 'running' | 'stopped' | 'error';

export type SchedulerType = 'none' | 'daily' | 'weekly' | 'custom';

export interface TaskScheduler {
  type: SchedulerType;
  cron?: string;
}

export interface TaskConfiguration {
  mode: 'headed' | 'headless';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: TaskCategory;
  scheduler: TaskScheduler;
  configuration: TaskConfiguration;
  status: TaskStatus;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskForm = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  'bot':            'Bot',
  'agent':          'Agent',
  'web-automation': 'Web Automation',
  'data-scraping':  'Data Scraping',
  'social-media':   'Social Media',
  'productivity':   'Productivity',
};
