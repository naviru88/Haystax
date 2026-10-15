import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient, withFetch, withInterceptorsFromDi,
} from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { OwnerAuthInterceptor } from './features/owner-identity/services/owner-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // withInterceptorsFromDi + OwnerAuthInterceptor: adds the Supabase JWT to /api/owner/**
    // requests only (D-TOKEN). Shared change — diff shown to Anoj. [AGENTS-W3 D-TOKEN]
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideClientHydration(withEventReplay()),
    OwnerAuthInterceptor,
  ]
};