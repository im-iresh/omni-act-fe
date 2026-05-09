export interface IntentFinalResult {
  query: string;
  detectedIntent: string;
  reasoning: string;
  confidence: number;
  stepsExecuted: number;
  finalResponse: string;
  intentModelName: string;
  finalModelName: string;
  success: boolean;
}

export interface IntentChunk {
  token: string;
  done: boolean;
  eventType?: string;
  finalResult?: IntentFinalResult;
}

export interface IntentResult {
  raw: string;
  target?: string;
  action?: string;
  query?: string;
  outputFormat?: string;
  confidence?: number;
}
