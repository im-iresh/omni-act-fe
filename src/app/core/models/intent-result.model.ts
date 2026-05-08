export interface IntentResult {
  raw: string;
  target?: string;
  action?: string;
  query?: string;
  outputFormat?: string;
  confidence?: number;
}

export interface IntentChunk {
  token: string;
  done: boolean;
}
