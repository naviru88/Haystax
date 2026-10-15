import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LocationSource = 'gps' | 'ip' | 'none';

export interface ResolvedLocation {
  lat: number;
  lng: number;
  source: LocationSource;
  // Present only when source is 'ip'.
  city?: string;
  //Present only when source is 'ip'.
  region?: string;
  //Precision hint. 'high' = GPS (meters), 'city' = IP (kilometers), Used by UI to decide how prominently to show the "approximate" note.
  accuracy: 'high' | 'city' | 'none';
}

interface IpLocationResponse {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  //Resolve the user's location: 1. Try browser GPS (precise, needs permission), 2. Fall back to IP-based lookup via backend proxy (city-level), 3.Throw if both fail — the caller should ask the user to pick a city.

  async resolve(): Promise<ResolvedLocation> {
    const gps = await this.tryGps();
    if (gps) return gps;

    const ip = await this.tryIp();
    if (ip) return ip;

    throw new Error('Could not determine location.');
  }

  //GPS

  private tryGps(): Promise<ResolvedLocation | null> {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }

    return new Promise<ResolvedLocation | null>((resolve) => {
      // Guard against double-resolve (browser may call both callbacks in rare cases).
      let settled = false;
      const finish = (v: ResolvedLocation | null) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          finish({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'gps',
            accuracy: 'high',
          }),
        (err) => {
          // Log for diagnostics but always resolve(null) so we fall through to IP.
          console.warn('[LocationService] GPS failed:', err.code, err.message);
          finish(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,     // 10s is enough for a good GPS fix on mobile
          maximumAge: 300_000, // accept a 5-min-old cached fix
        }
      );
    });
  }

  // IP

  private async tryIp(): Promise<ResolvedLocation | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<IpLocationResponse>(
          `${environment.apiBaseUrl}/api/discovery/listings/geo/ip-locate`
        )
      );
      if (res.lat == null || res.lng == null) return null;

      return {
        lat: res.lat,
        lng: res.lng,
        source: 'ip',
        city: res.city,
        region: res.region,
        accuracy: 'city',
      };
    } catch (err) {
      console.warn('[LocationService] IP lookup failed:', err);
      return null;
    }
  }
}
