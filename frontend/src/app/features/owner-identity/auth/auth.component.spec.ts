import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { AuthComponent } from './auth.component';
import { OWNER_API } from '../services/owner-api.interface';
import { SupabaseAuthService } from '../services/supabase-auth.service';
import { MockAuthService } from '../services/mock-auth.service';
import { ApiError } from '../services/api-error';
import { OwnerUser } from '../models/owner-user.model';

/** Fixture users mirroring mocks/users.json. */
const TENANT: OwnerUser = {
  id: 'u-tenant', display_name: 'Rashmi Perera', email: 'rashmi@student.lk',
  is_owner: false, is_admin: false, is_suspended: false,
};
const OWNER: OwnerUser = {
  id: 'u-owner', display_name: 'Kavinda Silva', email: 'kavinda@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: false,
};
const ADMIN: OwnerUser = {
  id: 'u-admin', display_name: 'Nadeesha Perera', email: 'nadeesha@haystax.lk',
  is_owner: false, is_admin: true, is_suspended: false,
};
const SUSPENDED: OwnerUser = {
  id: 'u-suspended', display_name: 'Chandana Rajapaksa', email: 'chandana@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: true,
  suspension_reason: 'Ownership removed after 3 listings were removed by moderation.',
};

function makeSupabaseStub(overrides: Partial<Record<'signIn' | 'signUp' | 'restoreSession' | 'signOut', unknown>> = {}) {
  return {
    sessionChanges: undefined,
    signIn: overrides.signIn ?? (() => Promise.resolve()),
    signUp: overrides.signUp ?? (() => Promise.resolve({ requiresEmailConfirmation: false })),
    restoreSession: overrides.restoreSession ?? (() => Promise.resolve(null)),
    signOut: overrides.signOut ?? (() => Promise.resolve()),
    getAccessToken: () => Promise.resolve('token'),
  } as unknown as SupabaseAuthService;
}

function makeApiStub(me: OwnerUser | (() => Promise<OwnerUser>)) {
  const getMe = typeof me === 'function' ? me : () => Promise.resolve(me);
  return {
    getMe,
    getProfile: () => Promise.resolve(me as OwnerUser),
    updateProfile: () => Promise.resolve(me as OwnerUser),
    becomeOwner: () => getMe(),
    listListings: () => Promise.resolve([]),
    getListing: () => Promise.reject(new Error('not found')),
    createListing: () => Promise.reject(new Error('nope')),
    updateListing: () => Promise.reject(new Error('nope')),
    publishListing: () => Promise.reject(new Error('nope')),
    listAmenities: () => Promise.resolve([]),
    getCurrentUser: () => me as OwnerUser,
    getMockUsers: () => [TENANT, OWNER, ADMIN, SUSPENDED],
    getMockSessionUser: () => undefined,
    switchUser: () => undefined,
    signInMock: () => Promise.resolve(undefined),
    signUpMock: () => Promise.reject(new Error('no')),
    deletePhoto: () => Promise.reject(new Error('no')),
    getPhotoBlob: () => Promise.reject(new Error('no')),
    uploadPhoto: () => { throw new Error('no'); },
    getPendingRequests: () => [],
    uiState: { subscribe: () => undefined } as never,
    setUiState: () => undefined,
  } as unknown as typeof OWNER extends never ? never : any;
}

describe('AuthComponent', () => {
  async function setup(opts: { supabase?: SupabaseAuthService; api?: unknown } = {}) {
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: OWNER_API, useValue: opts.api ?? makeApiStub(TENANT) },
        { provide: SupabaseAuthService, useValue: opts.supabase ?? makeSupabaseStub() },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    await settle(fixture);
    return { fixture, component, router };
  }

  /** Zoneless-friendly flush: run change detection, then drain microtasks, then re-render. */
  async function settle(fixture: import('@angular/core/testing').ComponentFixture<AuthComponent>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('redirects a tenant to / after login', async () => {
    const { component, router } = await setup({ api: makeApiStub(TENANT) });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.loginForm.setValue({ email: 'rashmi@student.lk', password: 'secret1' });
    await component.submit();

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('redirects an owner to /owner/dashboard after login', async () => {
    const { component, router } = await setup({ api: makeApiStub(OWNER) });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.loginForm.setValue({ email: 'kavinda@haystax.lk', password: 'secret1' });
    await component.submit();

    expect(navigate).toHaveBeenCalledWith(['/owner/dashboard']);
  });

  it('redirects an admin to the existing admin route after login', async () => {
    const { component, router } = await setup({ api: makeApiStub(ADMIN) });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.loginForm.setValue({ email: 'nadeesha@haystax.lk', password: 'secret1' });
    await component.submit();

    expect(navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('shows the suspended state for a suspended owner instead of redirecting', async () => {
    const { component, router } = await setup({ api: makeApiStub(SUSPENDED) });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.loginForm.setValue({ email: 'chandana@haystax.lk', password: 'secret1' });
    await component.submit();

    expect(component.state()).toBe('suspended');
    expect(component.suspendedReason()).toContain('3 listings');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the invalid-credentials state on wrong password', async () => {
    const supabase = makeSupabaseStub({
      signIn: () => Promise.reject(new ApiError(401, 'auth', 'Invalid login credentials')),
    });
    const { component } = await setup({ supabase });

    component.loginForm.setValue({ email: 'rashmi@student.lk', password: 'wrong!' });
    await component.submit();

    expect(component.state()).toBe('invalid-credentials');
    expect(component.serverMessage()).toContain('Invalid login credentials');
  });

  it('shows the email-taken state on duplicate registration', async () => {
    const supabase = makeSupabaseStub({
      signUp: () => Promise.reject(new ApiError(409, 'conflict', 'already registered')),
    });
    const { component } = await setup({ supabase });

    component.toggleMode();
    component.registerForm.setValue({
      display_name: 'New Tenant', email: 'rashmi@student.lk', password: 'secret1',
      confirm_password: 'secret1', phone_number: '',
    });
    await component.submit();

    expect(component.state()).toBe('email-taken');
    expect(component.serverMessage()).toContain('already registered');
  });

  it('disables the submit button while submitting and prevents double submit', async () => {
    let resolveSignIn!: () => void;
    const gate = new Promise<void>(res => { resolveSignIn = res; });
    const signIn = vi.fn(() => gate.then(() => undefined));
    const supabase = makeSupabaseStub({ signIn });
    const { fixture, component } = await setup({ supabase, api: makeApiStub(() => Promise.resolve(TENANT)) });

    component.loginForm.setValue({ email: 'rashmi@student.lk', password: 'secret1' });

    const submitPromise = component.submit();
    await settle(fixture);

    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.state()).toBe('submitting');
    expect(button.disabled).toBe(true);

    // Second submit while in flight must be ignored (single signIn call).
    await component.submit().catch(() => undefined);
    expect(signIn).toHaveBeenCalledTimes(1);

    resolveSignIn();
    await submitPromise;
    await settle(fixture);

    expect(component.state()).toBe('success');
  });

  it('blocks submit with visible errors when passwords do not match', async () => {
    const signUp = vi.fn(() => Promise.resolve({ requiresEmailConfirmation: false }));
    const supabase = makeSupabaseStub({ signUp });
    const { fixture, component } = await setup({ supabase });

    component.toggleMode();
    await settle(fixture);
    component.registerForm.setValue({
      display_name: 'New Tenant', email: 'new@student.lk', password: 'secret1',
      confirm_password: 'different', phone_number: '',
    });
    await component.submit();
    await settle(fixture);

    expect(component.registerForm.hasError('passwordMismatch')).toBe(true);
    expect(signUp).not.toHaveBeenCalled();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Passwords do not match');
  });

  it('blocks submit when the display name is too short', async () => {
    const signUp = vi.fn(() => Promise.resolve({ requiresEmailConfirmation: false }));
    const supabase = makeSupabaseStub({ signUp });
    const { fixture, component } = await setup({ supabase });

    component.toggleMode();
    await settle(fixture);
    component.registerForm.setValue({
      display_name: 'A', email: 'new@student.lk', password: 'secret1',
      confirm_password: 'secret1', phone_number: '',
    });
    await component.submit();
    await settle(fixture);

    expect(component.registerForm.get('display_name')?.invalid).toBe(true);
    expect(signUp).not.toHaveBeenCalled();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Display name must be 2–120 characters');
  });

  it('registering never sends any role field in the request payload', async () => {
    const signUp = vi.fn((dto: unknown) => Promise.resolve({ requiresEmailConfirmation: false }));
    const supabase = makeSupabaseStub({ signUp });
    const api = makeApiStub(() => Promise.resolve({ ...TENANT, email: 'new@student.lk' }));
    const updateProfile = vi.fn(() => Promise.resolve(TENANT));
    api.updateProfile = updateProfile;
    const { component, router } = await setup({ supabase, api });
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.toggleMode();
    component.registerForm.setValue({
      display_name: 'New Tenant', email: 'new@student.lk', password: 'secret1',
      confirm_password: 'secret1', phone_number: '+94 70 000 0000',
    });
    await component.submit();

    const payload = signUp.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toBeDefined();
    expect(payload).toEqual({
      display_name: 'New Tenant',
      email: 'new@student.lk',
      password: 'secret1',
      phone_number: '+94 70 000 0000',
    });
    for (const forbidden of ['is_owner', 'is_admin', 'is_suspended', 'role', 'roles']) {
      expect(Object.keys(payload)).not.toContain(forbidden);
    }
    // Optional phone number is sent to the profile endpoint after sign-up [D-REG].
    expect(updateProfile).toHaveBeenCalledWith({ phone_number: '+94 70 000 0000' });
  });

  it('shows the check-your-email state when email confirmation is required', async () => {
    const supabase = makeSupabaseStub({
      signUp: () => Promise.resolve({ requiresEmailConfirmation: true }),
    });
    const { fixture, component } = await setup({ supabase });

    component.toggleMode();
    await settle(fixture);
    component.registerForm.setValue({
      display_name: 'New Tenant', email: 'new@student.lk', password: 'secret1',
      confirm_password: 'secret1', phone_number: '',
    });
    await component.submit();
    await settle(fixture);

    expect(component.state()).toBe('check-email');
    expect(fixture.nativeElement.textContent).toContain('Check your email');
  });

  it('shows a network error state when the backend is unreachable', async () => {
    const supabase = makeSupabaseStub({
      signIn: () => Promise.reject(new ApiError(0, 'network', 'Failed to fetch')),
    });
    const { component } = await setup({ supabase });

    component.loginForm.setValue({ email: 'rashmi@student.lk', password: 'secret1' });
    await component.submit();

    expect(component.state()).toBe('network');
  });
});

describe('AuthComponent (mock mode, D-MOCK)', () => {
  beforeEach(() => {
    // Mock mode needs real fixture users and no network.
    TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        MockAuthService,
        { provide: OWNER_API, useExisting: MockAuthService },
        { provide: SupabaseAuthService, useValue: makeSupabaseStub() },
      ],
    });
  });

  it('signs in the mock owner and redirects to the dashboard', async () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    await component.mockSignIn('kavinda@haystax.lk');

    expect(navigate).toHaveBeenCalledWith(['/owner/dashboard']);
  });

  it('signs in the mock tenant and redirects home', async () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    await component.mockSignIn('rashmi@student.lk');

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('shows invalid-credentials for an unknown mock email', async () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    await component.mockSignIn('nobody@nowhere.lk');

    expect(component.state()).toBe('invalid-credentials');
  });

  it('mock registration never sets role flags', async () => {
    const fixture = TestBed.createComponent(AuthComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    await component.mockSignUp({ display_name: 'New Mock', email: 'newmock@student.lk', password: 'secret1' });

    const user = component['api'].getMockUsers().find(u => u.email === 'newmock@student.lk');
    expect(user?.is_owner).toBe(false);
    expect(user?.is_admin).toBe(false);
  });
});