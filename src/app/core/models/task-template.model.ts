export type TaskStatus = 'active' | 'idle' | 'running' | 'error';

export interface TaskTemplate {
  id: string;
  name: string;
  subtitle: string;
  iconName: string;
  accentColor: string;
  defaultPrompt: string;
  status: TaskStatus;
  tags: string[];
  illustrationType: 'product-compare' | 'social-orbit' | 'browser-scrape' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export type TaskTemplateForm = Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>;
