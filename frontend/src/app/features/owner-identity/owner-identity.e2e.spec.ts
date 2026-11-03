import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthComponent } from './auth/auth.component';
import { OwnerDashboardComponent } from './owner-dashboard/owner-dashboard.component';
import { MockAuthService } from './services/mock-auth.service';
import { OWNER_API } from './services/owner-api.interface';
import { SupabaseAuthService } from './services/supabase-auth.service';
import { BookingSummaryAdapter } from '../../shared/adapters/engagement-booking.adapter';
import { ListingWrite } from './models/owner-listing.model';
import { environment } from '../../../environments/environment';

/**
 * W4-C3 — E2E dummy run (AGENTS-W4 §5 W4-C3.3).
 *
 * Drives the whole Owner & Identity slice with `useMockApi`-style fixtures (MockAuthService,
 * no network) plus a stubbed Supabase client, so the flow runs without a backend:
 *
 *   Register -> Check your email -> Login -> Become owner -> Create listing
 *            -> Upload photo -> Publish listing -> Receive M3 mock booking
 *
 * It is deliberately one ordered spec: the point is that the steps compose, not that each
 * one is micro-asserted (those live in the per-component specs).
 */
const TENANT_EMAIL = 'rashmi@student.lk';        // mocks/users.json

function supabaseStub() {
  return {
    sessionChanges: undefined,
    signUp: () => Promise.resolve({ requiresEmailConfirmation: true }),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    restoreSession: () => Promise.resolve(null),
    getAccessToken: () => Promise.resolve('jwt-owner'),
    resendConfirmation: () => Promise.resolve(),
    isEmailConfirmed: () => true,
  } as unknown as SupabaseAuthService;
}

const BOOKING = {
  id: 'b-1',
  listingId: 'b1111111-0000-0000-0000-000000000101',
  listingTitle: 'New Boarding',
  tenantDisplayName: 'Tenant u1111111',
  requestedAt: '2026-10-29T00:00:00Z',
  status: 'pending' as const,
};

describe('Owner & Identity E2E (dummy session)', () => {
  // This flow covers the M3 adapter path, so pin the flag: flipping it for manual
  // click-through testing must not silently swap in the fixture pending-requests.
  const mockFlagAtLoad = environment.useMockApi;
  afterEach(() => { (environment as { useMockApi: boolean }).useMockApi = mockFlagAtLoad; });

  beforeEach(async () => {
    (environment as { useMockApi: boolean }).useMockApi = false;
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        MockAuthService,
        { provide: OWNER_API, useExisting: MockAuthService },
        { provide: SupabaseAuthService, useValue: supabaseStub() },
        {
          provide: BookingSummaryAdapter,
          // Stands in for Member 3's GET /api/engagement/tenancies response.
          useValue: { loadBookingSummaries: () => Promise.resolve({ ok: true, requests: [BOOKING] }) },
        },
      ],
    }).compileComponents();
  });

  it('register → confirm email → login → become owner → create → upload → publish → M3 booking', async () => {
    // 1. Register — Supabase email confirmation replaces admin approval. [D-AUTH-FLOW]
    const authFixture = TestBed.createComponent(AuthComponent);
    const auth = authFixture.componentInstance;
    authFixture.detectChanges();

    auth.toggleMode();
    auth.registerForm.setValue({
      display_name: 'New Owner',
      email: 'new@student.lk',
      password: 'secret1',
      confirm_password: 'secret1',
      phone_number: '',
    });
    await auth.submit();
    authFixture.detectChanges();

    expect(auth.state()).toBe('check-email');
    const authText = (authFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(authText).toContain('Check your email');
    expect(authText).toContain('No admin approval');
    authFixture.destroy();

    // 2. Login (tenant fixture) — roles are resolved server-side. [D-ROLES]
    const api = TestBed.inject(MockAuthService);
    const tenant = await api.signInMock(TENANT_EMAIL);
    expect(tenant).toBeDefined();
    const me = await api.getMe();
    expect(me.is_owner).toBe(false);
    expect(me.is_admin).toBe(false);

    // 3. Become an owner (CC-1); the same account can now own listings.
    const owner = await api.becomeOwner();
    expect(owner.is_owner).toBe(true);

    // 4. Create a listing — owner_id/status are server-decided, never in the payload.
    const write: ListingWrite = {
      title: 'New Boarding',
      description: 'A room near campus.',
      address_line_1: '12 Galle Road',
      city: 'Moratuwa',
      price_amount: 25000,
      currency_code: 'LKR',
      gender_policy: 'any',
      total_slots: 4,
      available_slots: 4,
      amenity_ids: [],
      rules: [],
    };
    expect(Object.keys(write)).not.toContain('owner_id');
    expect(Object.keys(write)).not.toContain('status');

    const created = await api.createListing(write);
    expect(created.id).toBeTruthy();
    expect(created.owner_id).toBe(me.id);
    expect(created.status).toBe('draft');

    // 5. Upload a photo — metadata gate first (D-LIMITS), then the stored record.
    const file = new File(['bytes'], 'room.png', { type: 'image/png' });
    const upload = await firstValueFrom(
      api.uploadPhoto(created.id, file, { is_primary: true }),
    );
    expect(upload.kind).toBe('done');
    if (upload.kind === 'done') {
      expect(upload.photo.storage_path).toBe('mock://room.png');
      expect(upload.photo.is_approved).toBe(false);   // moderation stays admin's job
    }

    // 6. Publish → pending_review (the owner never sets status directly).
    const published = await api.publishListing(created.id);
    expect(published.status).toBe('pending_review');

    // 7. Owner Dashboard renders the M3 booking summary through the adapter.
    const dashFixture = TestBed.createComponent(OwnerDashboardComponent);
    const dash = dashFixture.componentInstance;
    dashFixture.detectChanges();
    await flush(dashFixture);

    expect(dash.state()).toBe('ready');
    expect(dash.pendingState()).toBe('ready');
    expect(dash.pending().map(r => r.id)).toEqual([BOOKING.id]);

    const text = (dashFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pending tenancy requests');
    expect(text).toContain('New Boarding');
    expect(text).toContain('Pending');
  });
});

/** Drain the async load() chain deterministically (mirrors the component specs). */
async function flush(fixture: { detectChanges: () => void }): Promise<void> {
  for (let i = 0; i < 50; i++) { await Promise.resolve(); }
  await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 50; i++) { await Promise.resolve(); }
  fixture.detectChanges();
}
