import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IntentChunk } from '../models/intent-result.model';

export abstract class IntentStreamService {
  abstract streamIntent(prompt: string): Observable<IntentChunk>;
  abstract cancelStream(): void;
}

@Injectable({ providedIn: 'root' })
export class MockIntentStreamService extends IntentStreamService {
  private cancelSubject = new Subject<void>();

  streamIntent(prompt: string): Observable<IntentChunk> {
    const mockResponse =
      `Analyzing your request: "${prompt}"\n\n` +
      `I understand you want to perform automated web browsing. ` +
      `Target platform identified. ` +
      `Extracting structured task parameters — navigating to the relevant page, ` +
      `collecting data matching your criteria, and formatting results for export.`;

    const chars = mockResponse.split('');
    return new Observable<IntentChunk>(observer => {
      let index = 0;
      const intervalId = setInterval(() => {
        if (index < chars.length) {
          observer.next({ token: chars[index], done: false });
          index++;
        } else {
          observer.next({ token: '', done: true });
          observer.complete();
          clearInterval(intervalId);
        }
      }, 18);

      return () => clearInterval(intervalId);
    });
  }

  cancelStream(): void {
    this.cancelSubject.next();
  }
}
