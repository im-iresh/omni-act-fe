import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app';
import { HomeComponent } from './app/features/home/home.component';
import { StoreComponent } from './app/features/store/store.component';
import { environment } from './environments/environment';
import {
  INTENT_STREAM_SERVICE,
  BROWSER_USE_SERVICE,
} from './app/core/tokens/service.tokens';
import { MockIntentStreamService, RealIntentStreamService } from './app/core/services/intent-stream.service';
import { MockBrowserUseService, RealBrowserAutomationService } from './app/core/services/browser-use.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter([
      { path: 'home',  component: HomeComponent },
      { path: 'store', component: StoreComponent },
      { path: '',      redirectTo: 'home', pathMatch: 'full' },
    ]),
    provideHttpClient(),
    {
      provide: INTENT_STREAM_SERVICE,
      useClass: environment.useMockServices ? MockIntentStreamService : RealIntentStreamService,
    },
    {
      provide: BROWSER_USE_SERVICE,
      useClass: environment.useMockServices ? MockBrowserUseService : RealBrowserAutomationService,
    },
  ]
}).catch(err => console.error(err));
