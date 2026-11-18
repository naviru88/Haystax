import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { provideOwnerApi } from './features/owner-identity/services/provide-owner-api';
import { OwnerAuthInterceptor } from './features/owner-identity/services/owner-auth.interceptor';

function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      console.error('[GoogleMaps] Script failed to load — falling back to OSM');
      window.dispatchEvent(new CustomEvent('google-maps-failed'));
      resolve();
    };
    document.head.appendChild(script);
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: OwnerAuthInterceptor, multi: true },
    provideOwnerApi(),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
      return loadGoogleMaps(environment.googleMapsApiKey);
    }),
  ],
};
