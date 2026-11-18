import { Injectable, inject } from '@angular/core';
import {
  HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SupabaseAuthService } from './supabase-auth.service';
import { ApiError, toApiError } from './api-error';
import { Router } from '@angular/router';

/**
 * D-TOKEN: adds `Authorization: Bearer <access token>` to Haystax backend API requests.
 * Supabase and other external URLs are left untouched. A 401 from the backend signs the
 * user out and returns to /auth/login (the page still receives the ApiError).
 * Registered in app.config.ts. [D-TOKEN, W3-C1.3]
 */
@Injectable()
export class OwnerAuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const base = environment.apiBaseUrl;
    const isBackendApi = !!base && req.url.startsWith(`${base}/api/`);
    const isProtectedApi = !!base && [
      `${base}/api/owner/`,
      `${base}/api/engagement/`,
      `${base}/api/admin/`,
    ].some(prefix => req.url.startsWith(prefix));

    if (!isBackendApi) {
      return next.handle(req);
    }

    return from(this.auth.getAccessToken()).pipe(
      mergeMap(token => {
        let out = req;
        if (token) {
          out = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        }
        return next.handle(out).pipe(
          catchError((err: unknown) => this.handleError(err, isProtectedApi)),
        );
      }),
    );
  }

  private handleError(err: unknown, isProtectedApi: boolean): Observable<never> {
    const apiError = toApiError(err);

    // 401 from the API → sign out and go to login (W3-C1.3).
    if (isProtectedApi && apiError.kind === 'auth' && apiError.status === 401 && err instanceof HttpErrorResponse) {
      this.auth.signOut().catch(() => undefined);
      void this.router.navigate(['/auth/login']);
    }

    return throwError(() => apiError);
  }
}

/** Human-safe type guard used by tests: an ApiError converted from a 401 response. */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
