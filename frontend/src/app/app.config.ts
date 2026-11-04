import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as any).google?.maps) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    // Resolve (not reject) on error so the app still boots — the component
    // handles failure via the `google-maps-failed` event.
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
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      // Only load in the browser — never on the SSR server
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return;
      }
      return loadGoogleMaps(environment.googleMapsApiKey);
    }),
  ],
};
