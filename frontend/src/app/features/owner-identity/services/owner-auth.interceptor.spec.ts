import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpRequest, provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';

import { OwnerAuthInterceptor } from './owner-auth.interceptor';
import { SupabaseAuthService } from './supabase-auth.service';
import { ApiError } from './api-error';
import { environment } from '../../../../environments/environment';

/** Minimal supabase stub with a controllable token. */
class TokenStub {
  token: string | null = 'test-access-token';
  signedOut = false;
  getAccessToken() { return Promise.resolve(this.token); }
  signOut() { this.signedOut = true; return Promise.resolve(); }
}

describe('OwnerAuthInterceptor', () => {
  let interceptor: OwnerAuthInterceptor;
  let tokenStub: TokenStub;
  let router: Router;

  beforeEach(() => {
    tokenStub = new TokenStub();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideRouter([]),
        OwnerAuthInterceptor,
        { provide: SupabaseAuthService, useValue: tokenStub },
      ],
    });
    interceptor = TestBed.inject(OwnerAuthInterceptor);
    router = TestBed.inject(Router);
  });


  /** Concrete HttpHandler stub (HttpHandler is abstract in Angular 21). */
  function handlerStub(): HttpHandler {
    return {
      handle: () => of({ type: 0, body: null, status: 200 } as HttpEvent<unknown>),
    } as HttpHandler;
  }

  function runThrough(url: string, handler: HttpHandler): Promise<unknown> {
    const req = new HttpRequest('GET', url);
    return firstValueFrom(interceptor.intercept(req, handler) as never).catch(e => e as unknown);
  }

  it('adds the Authorization header only to /api/owner URLs on the API base', async () => {
    const base = environment.apiBaseUrl;

    // Owner API URL → header added.
    const ownerHandler = handlerStub();
    const ownerUrl = `${base}/api/owner/auth/me`;
    const ownerRequest = new HttpRequest('GET', ownerUrl);
    const ownerSpy = vi.fn((req: HttpRequest<unknown>) => of({ type: 0, body: null, status: 200 } as HttpEvent<unknown>));
    ownerHandler.handle = ownerSpy as HttpHandler['handle'];
    await firstValueFrom(interceptor.intercept(ownerRequest, ownerHandler) as never);
    const ownerReq = ownerSpy.mock.calls[0]?.[0] as HttpRequest<unknown>;
    expect(ownerReq.headers.get('Authorization')).toBe('Bearer test-access-token');

    // Supabase URL → no header.
    const supabaseHandler = handlerStub();
    const supabaseSpy = vi.fn((req: HttpRequest<unknown>) => of({ type: 0, body: null, status: 200 } as HttpEvent<unknown>));
    supabaseHandler.handle = supabaseSpy as HttpHandler['handle'];
    await firstValueFrom(
      interceptor.intercept(new HttpRequest('GET', 'https://xyz.supabase.co/auth/v1/token'), supabaseHandler) as never,
    );
    const supabaseReq = supabaseSpy.mock.calls[0]?.[0] as HttpRequest<unknown>;
    expect(supabaseReq.headers.has('Authorization')).toBe(false);

    // Other slices (discovery) → no header.
    const discHandler = handlerStub();
    const discSpy = vi.fn((req: HttpRequest<unknown>) => of({ type: 0, body: null, status: 200 } as HttpEvent<unknown>));
    discHandler.handle = discSpy as HttpHandler['handle'];
    await firstValueFrom(
      interceptor.intercept(new HttpRequest('GET', `${base}/api/discovery/listings`), discHandler) as never,
    );
    const discReq = discSpy.mock.calls[0]?.[0] as HttpRequest<unknown>;
    expect(discReq.headers.has('Authorization')).toBe(false);
  });

  it('does not add the header when no token is present', async () => {
    tokenStub.token = null;
    const base = environment.apiBaseUrl;
    const handler = handlerStub();
    const spy = vi.fn((req: HttpRequest<unknown>) => of({ type: 0, body: null, status: 200 } as HttpEvent<unknown>));
    handler.handle = spy as HttpHandler['handle'];

    await firstValueFrom(
      interceptor.intercept(new HttpRequest('GET', `${base}/api/owner/auth/me`), handler) as never,
    );
    const req = spy.mock.calls[0]?.[0] as HttpRequest<unknown>;
    expect(req.headers.has('Authorization')).toBe(false);
  });

  it('signs out and redirects to /auth/login on a 401 from the owner API', async () => {
    const base = environment.apiBaseUrl;
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const handler = handlerStub();
    handler.handle = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url: `${base}/api/owner/auth/me` }));

    const err = await runThrough(`${base}/api/owner/auth/me`, handler);

    expect(tokenStub.signedOut).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe('auth');
  });

  it('does NOT sign out on a 401 from another slice', async () => {
    const base = environment.apiBaseUrl;
    const handler = handlerStub();
    handler.handle = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    const err = await runThrough(`${base}/api/discovery/listings`, handler);

    // Non-owner URLs are outside the interceptor scope: passed through untouched.
    expect(tokenStub.signedOut).toBe(false);
    expect(err).toBeInstanceOf(HttpErrorResponse);
  });

  it('passes through non-owner URLs untouched (no token fetch)', async () => {
    const handler = handlerStub();
    const spy = vi.fn((req: HttpRequest<unknown>) => of({ type: 0, body: null, status: 200 } as HttpEvent<unknown>));
    handler.handle = spy as HttpHandler['handle'];

    await firstValueFrom(
      interceptor.intercept(new HttpRequest('GET', 'https://example.com/somewhere'), handler) as never,
    );
    const req = spy.mock.calls[0]?.[0] as HttpRequest<unknown>;
    expect(req.headers.has('Authorization')).toBe(false);
    expect(req.url).toBe('https://example.com/somewhere');
  });
});