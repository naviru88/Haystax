import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { authGuard } from './auth.guard';
import { ownerGuard } from './owner.guard';
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
        { provide: SupabaseAuthService, useValue: { restoreSession: () => Promise.resolve(null) } },
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
        { provide: SupabaseAuthService, useValue: { restoreSession: () => Promise.resolve({}) } },
      ],
    });

    (environment as { useMockApi: boolean }).useMockApi = false;
    const result = await runGuard(authGuard);

    expect(result).toBe(true);
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