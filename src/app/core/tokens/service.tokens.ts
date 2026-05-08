import { InjectionToken } from '@angular/core';
import { IntentStreamService } from '../services/intent-stream.service';
import { BrowserUseService } from '../services/browser-use.service';

export const INTENT_STREAM_SERVICE =
  new InjectionToken<IntentStreamService>('INTENT_STREAM_SERVICE');

export const BROWSER_USE_SERVICE =
  new InjectionToken<BrowserUseService>('BROWSER_USE_SERVICE');
