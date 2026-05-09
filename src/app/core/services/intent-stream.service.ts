import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IntentChunk, IntentFinalResult } from '../models/intent-result.model';
import { environment } from '../../../environments/environment';

/** Delay between mock intent stream events (ms). Increase for slower pacing, decrease for faster testing. */
export const MOCK_INTENT_STREAM_DELAY_MS = 600;

export abstract class IntentStreamService {
  abstract streamIntent(prompt: string): Observable<IntentChunk>;
  abstract cancelStream(): void;
}

@Injectable()
export class MockIntentStreamService extends IntentStreamService {
  private cancelled = false;

  streamIntent(prompt: string): Observable<IntentChunk> {
    this.cancelled = false;
    const events: Array<{ token: string; eventType: string }> = [
      { token: 'Detecting intent…', eventType: 'intent_detection_started' },
      { token: 'Model selected. Analyzing request…', eventType: 'model_selected' },
      { token: 'Intent identified. Building execution plan…', eventType: 'intent_detected' },
    ];

    return new Observable<IntentChunk>(observer => {
      let step = 0;
      const intervalId = setInterval(() => {
        if (this.cancelled) {
          clearInterval(intervalId);
          observer.complete();
          return;
        }
        if (step < events.length) {
          observer.next({ token: events[step].token, done: false, eventType: events[step].eventType });
          step++;
        } else {
          const finalResult: IntentFinalResult = {
            query: prompt,
            detectedIntent: 'Web Browsing Automation',
            reasoning: prompt,
            confidence: 0.92,
            stepsExecuted: 3,
            finalResponse: 'Mock execution complete.',
            intentModelName: 'mock-intent-model',
            finalModelName: 'mock-final-model',
            success: true,
          };
          observer.next({ token: '', done: true, finalResult });
          observer.complete();
          clearInterval(intervalId);
        }
      }, MOCK_INTENT_STREAM_DELAY_MS);
      return () => clearInterval(intervalId);
    });
  }

  cancelStream(): void {
    this.cancelled = true;
  }
}

@Injectable()
export class RealIntentStreamService extends IntentStreamService {
  private abortController?: AbortController;

  streamIntent(prompt: string): Observable<IntentChunk> {
    return new Observable<IntentChunk>(observer => {
      const controller = new AbortController();
      this.abortController = controller;

      const run = async () => {
        const response = await fetch(
          `${environment.intentApiBaseUrl}/api/execute/stream`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: prompt }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          observer.error(new Error(`HTTP ${response.status}`));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) { observer.complete(); break; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              try {
                const data = JSON.parse(jsonStr);
                if (currentEventType) {
                  observer.next({ token: data.message ?? '', done: false, eventType: currentEventType });
                  currentEventType = '';
                } else {
                  observer.next({ token: '', done: true, finalResult: mapFinalResult(data) });
                  observer.complete();
                  return;
                }
              } catch { /* ignore malformed lines */ }
            } else if (line === '') {
              // SSE message boundary — no-op, currentEventType already cleared after data
            }
          }
        }
      };

      run().catch(err => {
        if (err.name === 'AbortError') observer.complete();
        else observer.error(err);
      });

      return () => controller.abort();
    });
  }

  cancelStream(): void {
    this.abortController?.abort();
  }
}

function mapFinalResult(raw: Record<string, unknown>): IntentFinalResult {
  return {
    query:            String(raw['query']             ?? ''),
    detectedIntent:   String(raw['detected_intent']   ?? ''),
    reasoning:        String(raw['reasoning']         ?? ''),
    confidence:       Number(raw['confidence']        ?? 0),
    stepsExecuted:    Number(raw['steps_executed']    ?? 0),
    finalResponse:    String(raw['final_response']    ?? ''),
    intentModelName:  String(raw['intent_model_name'] ?? ''),
    finalModelName:   String(raw['final_model_name']  ?? ''),
    success:          Boolean(raw['success']),
  };
}
