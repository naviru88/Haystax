import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient, withFetch, withInterceptorsFromDi,
} from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { OwnerAuthInterceptor } from './features/owner-identity/services/owner-auth.interceptor';
import { provideOwnerApi } from './features/owner-identity/services/provide-owner-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // D-MOCK: ONE OwnerApi instance for the whole app. Registering it per-route would give
    // the login page and the guarded pages separate MockAuthService instances, so the mock
    // session set at /auth/login would not be visible to authGuard/ownerGuard.
    provideOwnerApi(),
    // withInterceptorsFromDi + OwnerAuthInterceptor: adds the Supabase JWT to /api/owner/**
    // requests only (D-TOKEN). Shared change — diff shown to Anoj. [AGENTS-W3 D-TOKEN]
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideClientHydration(withEventReplay()),
    OwnerAuthInterceptor,
  ]
};