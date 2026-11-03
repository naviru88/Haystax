import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { authGuard } from './auth.guard';
import { ownerGuard } from './owner.guard';
import { guestGuard } from './guest.guard';
import { adminGuard } from './admin.guard';
import { OWNER_API } from '../services/owner-api.interface';
import { SupabaseAuthService } from '../services/supabase-auth.service';
import { MockAuthService } from '../services/mock-auth.service';
import { ApiError } from '../services/api-error';
import { OwnerUser } from '../models/owner-user.model';
import { environment } from '../../../../environments/environment';

const TENANT: OwnerUser = {
  id: 't', display_name: 'Tenant', email: 'tenant@x.lk',
  is_owner: false, is_admin: false, is_suspended: false,
};
const OWNER: OwnerUser = {
  id: 'o', display_name: 'Owner', email: 'owner@x.lk',
  is_owner: true, is_admin: false, is_suspended: false,
};
const SUSPENDED_OWNER: OwnerUser = {
  id: 's', display_name: 'Suspended', email: 's@x.lk',
  is_owner: true, is_admin: false, is_suspended: true,
};

function apiStub(me: OwnerUser | (() => Promise<OwnerUser>)): unknown {
  const getMe = typeof me === 'function' ? me : () => Promise.resolve(me);
  return {
    getMe,
    getMockSessionUser: () => undefined,
    switchUser: () => undefined,
  };
}


/** Guards use inject(); run them inside a test injection context. */
async function runGuard(fn: unknown): Promise<boolean | UrlTree> {
  return TestBed.runInInjectionContext(fn as () => Promise<boolean | UrlTree>);
}

describe('authGuard', () => {
  it('blocks anonymous users with a redirect to /auth/login (real mode)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: SupabaseAuthService, useValue: { restoreSession: () => Promise.resolve(null), isEmailConfirmed: () => false } },
      ],
    });

    (environment as { useMockApi: boolean }).useMockApi = false;
    const result = await runGuard(authGuard);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });

  it('allows a signed-in user through (real mode)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: SupabaseAuthService,
          useValue: {
            restoreSession: () => Promise.resolve({ user: { email_confirmed_at: '2026-10-01T00:00:00Z' } }),
            isEmailConfirmed: (s: { user?: { email_confirmed_at?: string } } | null) =>
              !!s?.user?.email_confirmed_at,
          },
        },
      ],
    });

    (environment as { useMockApi: boolean }).useMockApi = false;
    const result = await runGuard(authGuard);

    expect(result).toBe(true);
  });

  it('redirects an unconfirmed session to /auth/login with the confirm-email notice (D-AUTH-FLOW)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: SupabaseAuthService,
          useValue: {
            restoreSession: () => Promise.resolve({ user: { email_confirmed_at: null } }),
            isEmailConfirmed: (s: { user?: { email_confirmed_at?: string | null } } | null) =>
              !!s?.user?.email_confirmed_at,
          },
        },
      ],
    });

    (environment as { useMockApi: boolean }).useMockApi = false;
    const result = await runGuard(authGuard);

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toBe('/auth/login?notice=confirm-email');
    expect(tree.queryParams['notice']).toBe('confirm-email');
  });

  it('blocks anonymous users in mock mode when no fixture is signed in', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        MockAuthService,
        { provide: OWNER_API, useExisting: MockAuthService },
        { provide: SupabaseAuthService, useValue: {} },
      ],
    });

    (environment as { useMockApi: boolean }).useMockApi = true;
    try {
      const result = await runGuard(authGuard);
      expect(result).toBeInstanceOf(UrlTree);
      expect((result as UrlTree).toString()).toBe('/auth/login');
    } finally {
      (environment as { useMockApi: boolean }).useMockApi = false;
    }
  });

  it('allows a signed-in mock user through', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        MockAuthService,
        { provide: OWNER_API, useExisting: MockAuthService },
        { provide: SupabaseAuthService, useValue: {} },
      ],
    });

    const mock = TestBed.inject(MockAuthService);
    await mock.signInMock('kavinda@haystax.lk');

    (environment as { useMockApi: boolean }).useMockApi = true;
    try {
      const result = await runGuard(authGuard);
      expect(result).toBe(true);
    } finally {
      (environment as { useMockApi: boolean }).useMockApi = false;
    }
  });
});

describe('ownerGuard', () => {
  function setup(me: OwnerUser | (() => Promise<OwnerUser>)) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: OWNER_API, useValue: apiStub(me) },
        { provide: SupabaseAuthService, useValue: {} },
      ],
    });
    (environment as { useMockApi: boolean }).useMockApi = false;
    return TestBed.inject(Router);
  }

  it('allows an owner through', async () => {
    setup(OWNER);
    const result = await runGuard(ownerGuard);
    expect(result).toBe(true);
  });

  it('blocks a tenant with a redirect to the authorization state /owner/required', async () => {
    const router = setup(TENANT);
    const result = await runGuard(ownerGuard);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/owner/required');
    expect(router).toBeDefined();
  });

  it('allows a suspended owner through (read-only access)', async () => {
    setup(SUSPENDED_OWNER);
    const result = await runGuard(ownerGuard);
    expect(result).toBe(true);
  });

  it('redirects to /auth/login on a 401 from /auth/me', async () => {
    setup(() => Promise.reject(new ApiError(401, 'auth', 'Unauthorized')));
    const result = await runGuard(ownerGuard);
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });
});
/**
 * guestGuard / adminGuard — the login-first routing pair.
 * guestGuard is the mirror of authGuard, so the two share the same fake user matrix.
 */
describe('guestGuard', () => {
  function setup(opts: {
    mock?: boolean;
    sessionUser?: OwnerUser;
    me?: OwnerUser;
    session?: unknown;
  }) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: OWNER_API,
          useValue: {
            getMockSessionUser: () => opts.sessionUser,
            getMe: () => Promise.resolve(opts.me as OwnerUser),
          },
        },
        {
          provide: SupabaseAuthService,
          useValue: {
            restoreSession: () => Promise.resolve(opts.session ?? null),
            isEmailConfirmed: () => true,
          },
        },
      ],
    });
    (environment as { useMockApi: boolean }).useMockApi = !!opts.mock;
    return TestBed.inject(Router);
  }

  afterEach(() => { (environment as { useMockApi: boolean }).useMockApi = false; });

  it('lets an anonymous visitor see the auth page (mock mode)', async () => {
    setup({ mock: true });
    expect(await runGuard(guestGuard)).toBe(true);
  });

  it('bounces a signed-in tenant to /discover (mock mode)', async () => {
    setup({ mock: true, sessionUser: TENANT, me: TENANT });
    const result = await runGuard(guestGuard);
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/discover');
  });

  it('bounces a signed-in owner to /owner/dashboard (mock mode)', async () => {
    setup({ mock: true, sessionUser: OWNER, me: OWNER });
    expect((await runGuard(guestGuard) as UrlTree).toString()).toBe('/owner/dashboard');
  });

  it('does not redirect away from the login page when /auth/me fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: OWNER_API,
          useValue: {
            getMockSessionUser: () => TENANT,
            getMe: () => Promise.reject(new Error('backend down')),
          },
        },
        { provide: SupabaseAuthService, useValue: {} },
      ],
    });
    (environment as { useMockApi: boolean }).useMockApi = true;
    expect(await runGuard(guestGuard)).toBe(true);
  });

  it('lets an anonymous visitor see the auth page (real mode)', async () => {
    setup({ mock: false, session: null });
    expect(await runGuard(guestGuard)).toBe(true);
  });

  it('bounces a signed-in admin to /admin (real mode)', async () => {
    setup({
      mock: false,
      session: { user: { email_confirmed_at: '2026-01-01T00:00:00Z' } },
      me: { ...TENANT, is_admin: true },
    });
    expect((await runGuard(guestGuard) as UrlTree).toString()).toBe('/admin');
  });
});

describe('adminGuard', () => {
  function setup(me: OwnerUser, sessionUser?: OwnerUser) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: OWNER_API,
          useValue: { getMockSessionUser: () => sessionUser, getMe: () => Promise.resolve(me) },
        },
        { provide: SupabaseAuthService, useValue: {} },
      ],
    });
    (environment as { useMockApi: boolean }).useMockApi = false;
  }

  afterEach(() => { (environment as { useMockApi: boolean }).useMockApi = false; });

  it('allows an admin through', async () => {
    setup({ ...TENANT, is_admin: true });
    expect(await runGuard(adminGuard)).toBe(true);
  });

  it('keeps a tenant out of the admin panel', async () => {
    setup(TENANT);
    expect((await runGuard(adminGuard) as UrlTree).toString()).toBe('/discover');
  });

  it('redirects to /auth/login when there is no mock session', async () => {
    setup(TENANT, undefined);
    (environment as { useMockApi: boolean }).useMockApi = true;
    expect((await runGuard(adminGuard) as UrlTree).toString()).toBe('/auth/login');
  });
});
