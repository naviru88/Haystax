import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { OWNER_API } from './features/owner-identity/services/owner-api.interface';
import { SupabaseAuthService } from './features/owner-identity/services/supabase-auth.service';
import { OwnerUser } from './features/owner-identity/models/owner-user.model';
import { environment } from '../environments/environment';

/**
 * Route-table integration: drives the REAL `routes` array through the router, so this
 * fails if the guards, the shell layout route or the redirects are wired wrongly.
 * Mock mode only — no network, no Supabase.
 */
const TENANT: OwnerUser = {
  id: 't', display_name: 'Rashmi Perera', email: 'rashmi@student.lk',
  is_owner: false, is_admin: false, is_suspended: false,
};

let sessionUser: OwnerUser | undefined;

const ownerApiStub = {
  uiState: signal('success').asReadonly(),
  setUiState: () => undefined,
  getCurrentUser: () => sessionUser,
  getMockUsers: () => [TENANT],
  switchUser: (id: string) => { sessionUser = id ? TENANT : undefined; },
  getMockSessionUser: () => sessionUser,
  getMe: () => sessionUser ? Promise.resolve(sessionUser) : Promise.reject(new Error('Not signed in')),
  getProfile: () => Promise.resolve(TENANT as never),
  updateProfile: () => Promise.resolve(TENANT as never),
  becomeOwner: () => Promise.resolve(TENANT),
  listListings: () => Promise.resolve([]),
  getListing: () => Promise.reject(new Error('not found')),
  createListing: () => Promise.reject(new Error('nope')),
  updateListing: () => Promise.reject(new Error('nope')),
  publishListing: () => Promise.reject(new Error('nope')),
  uploadPhoto: () => { throw new Error('nope'); },
  deletePhoto: () => Promise.reject(new Error('nope')),
  getPhotoBlob: () => Promise.reject(new Error('nope')),
  listAmenities: () => Promise.resolve([]),
  getPendingRequests: () => [],
  signInMock: () => Promise.resolve(sessionUser),
  signUpMock: () => Promise.reject(new Error('nope')),
};

async function setup(): Promise<{ harness: RouterTestingHarness; router: Router }> {
  await TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      { provide: OWNER_API, useValue: ownerApiStub },
      {
        provide: SupabaseAuthService,
        useValue: {
          restoreSession: () => Promise.resolve(null),
          isEmailConfirmed: () => false,
          signOut: () => Promise.resolve(),
        },
      },
    ],
  }).compileComponents();

  const harness = await RouterTestingHarness.create();
  return { harness, router: TestBed.inject(Router) };
}

describe('app routes (login first)', () => {
  beforeEach(() => {
    sessionUser = undefined;
    (environment as { useMockApi: boolean }).useMockApi = true;
  });

  afterEach(() => { (environment as { useMockApi: boolean }).useMockApi = true; });

  it('sends an anonymous visitor from / to the login page', async () => {
    const { harness, router } = await setup();

    await harness.navigateByUrl('/');

    expect(router.url).toBe('/auth/login');
  });

  it('keeps an anonymous visitor out of /discover', async () => {
    const { harness, router } = await setup();

    await harness.navigateByUrl('/discover');

    expect(router.url).toBe('/auth/login');
  });

  it('sends unknown URLs to the login page', async () => {
    const { harness, router } = await setup();

    await harness.navigateByUrl('/no-such-page');

    expect(router.url).toBe('/auth/login');
  });

  it('renders the login page without the app shell', async () => {
    const { harness } = await setup();

    await harness.navigateByUrl('/auth/login');

    const el = harness.routeNativeElement as HTMLElement;
    // routeNativeElement IS the activated component host, so check its own tag name.
    expect(el.tagName.toLowerCase()).toBe('app-auth');
    expect(el.closest('app-shell')).toBeNull();
  });

  it('lets a signed-in tenant into /discover, wrapped in the app shell', async () => {
    sessionUser = TENANT;
    const { harness, router } = await setup();

    await harness.navigateByUrl('/discover');

    expect(router.url).toBe('/discover');
    expect(harness.routeNativeElement?.querySelector('app-discover')).toBeTruthy();
    expect(document.querySelector('app-shell')).toBeTruthy();
  });

  it('bounces a signed-in tenant away from the login page', async () => {
    sessionUser = TENANT;
    const { harness, router } = await setup();

    await harness.navigateByUrl('/auth/login');

    expect(router.url).toBe('/discover');
  });
});
