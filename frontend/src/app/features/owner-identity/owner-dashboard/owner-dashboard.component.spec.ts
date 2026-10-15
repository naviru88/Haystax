import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { OwnerDashboardComponent } from './owner-dashboard.component';
import { OWNER_API } from '../services/owner-api.interface';
import { ApiError } from '../services/api-error';
import { OwnerUser } from '../models/owner-user.model';
import { OwnerListing } from '../models/owner-listing.model';

const OWNER: OwnerUser = {
  id: 'u-owner', display_name: 'Kavinda Silva', email: 'kavinda@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: false,
};
const SUSPENDED: OwnerUser = {
  id: 'u-susp', display_name: 'Chandana Rajapaksa', email: 'chandana@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: true,
  suspension_reason: 'Ownership removed after moderation.',
};
const TENANT: OwnerUser = {
  id: 'u-tenant', display_name: 'Rashmi Perera', email: 'rashmi@student.lk',
  is_owner: false, is_admin: false, is_suspended: false,
};

function listing(overrides: Partial<OwnerListing>): OwnerListing {
  return {
    id: 'l-1', owner_id: OWNER.id, title: 'Kandy Boarding', description: 'desc',
    address_line_1: '1 Main St', city: 'Kandy', price_amount: 25000,
    currency_code: 'LKR', gender_policy: 'any', total_slots: 4, available_slots: 2,
    status: 'draft', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    photos: [], amenities: [], rules: [],
    ...overrides,
  };
}

function apiStub(overrides: Partial<Record<keyof ReturnType<typeof makeApi>, unknown>> = {}) {
  return { ...makeApi(), ...overrides } as unknown as typeof OWNER extends never ? never : any;
}

function makeApi() {
  const me = OWNER;
  let listings: OwnerListing[] = [];
  return {
    getMe: () => Promise.resolve(me),
    listListings: () => Promise.resolve(listings),
    becomeOwner: () => Promise.resolve({ ...me, is_owner: true }),
    publishListing: () => Promise.reject(new Error('not stubbed')),
    getPhotoBlob: () => Promise.reject(new Error('no photo bytes')),
    getMockSessionUser: () => undefined,
    getPendingRequests: () => [],
  };
}

async function createComponent(api: unknown): Promise<{
  fixture: import('@angular/core/testing').ComponentFixture<OwnerDashboardComponent>;
  component: OwnerDashboardComponent;
}> {
  await TestBed.configureTestingModule({
    imports: [OwnerDashboardComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: OWNER_API, useValue: api },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(OwnerDashboardComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  // Drain ngOnInit()'s async load() chain deterministically (zoneless tests: whenStable
  // resolves before the promises complete, so we flush microtasks + a macrotask instead).
  for (let i = 0; i < 50; i++) { await Promise.resolve(); }
  await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 50; i++) { await Promise.resolve(); }
  fixture.detectChanges();
  return { fixture, component };
}

describe('OwnerDashboardComponent', () => {
  it('renders only the listings the API returned (ready state)', async () => {
    const api = apiStub({});
    api.listListings = () => Promise.resolve([
      listing({ id: 'l-1', title: 'Kandy Boarding', city: 'Kandy', status: 'draft' }),
      listing({ id: 'l-2', title: 'Colombo Room', city: 'Colombo', status: 'published' }),
    ]);

    const { fixture, component } = await createComponent(api);

    expect(component.state()).toBe('ready');
    expect(component.listings().map(l => l.id)).toEqual(['l-1', 'l-2']);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kandy Boarding');
    expect(text).toContain('Colombo Room');
  });

  it('shows the empty state with a create CTA when there are no listings', async () => {
    const api = apiStub({});
    api.listListings = () => Promise.resolve([]);

    const { fixture, component } = await createComponent(api);

    expect(component.state()).toBe('empty');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No listings yet');
    expect(fixture.nativeElement.querySelector('a[href="/owner/listings/new"]')).toBeTruthy();
  });

  it('shows the error state with a retry button when loading fails', async () => {
    const api = apiStub({});
    api.getMe = () => Promise.reject(new ApiError(null, 'network', 'Cannot reach the server'));
    api.listListings = () => Promise.reject(new ApiError(null, 'network', 'Cannot reach the server'));

    const { fixture, component } = await createComponent(api);

    expect(component.state()).toBe('error');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load your dashboard');
    expect(text).toContain('Retry');
  });

  it('shows the forbidden state with a become-owner button for a tenant', async () => {
    const api = apiStub({});
    api.getMe = () => Promise.resolve(TENANT);
    api.listListings = () => Promise.reject(new ApiError(403, 'forbidden', 'Forbidden'));

    const { fixture, component } = await createComponent(api);

    expect(component.state()).toBe('forbidden');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Owner access required');
    expect(text).toContain('Become an owner');
  });

  it('become-owner flow reloads /me and shows the dashboard', async () => {
    let me = TENANT;
    const api = apiStub({});
    api.getMe = () => Promise.resolve(me);
    api.listListings = () => Promise.resolve(me.is_owner ? [listing({})] : []);
    api.becomeOwner = () => {
      me = { ...TENANT, is_owner: true };
      return Promise.resolve(me);
    };

    const { component } = await createComponent(api);
    expect(component.state()).toBe('forbidden');

    await component.becomeOwner();
    expect(me.is_owner).toBe(true);
    expect(component.state()).toBe('ready');
  });

  it('shows the suspended state with banner and no action buttons', async () => {
    const api = apiStub({});
    api.getMe = () => Promise.resolve(SUSPENDED);
    api.listListings = () => Promise.resolve([
      listing({ id: 'l-1', status: 'draft' }),
      listing({ id: 'l-2', status: 'published' }),
    ]);

    const { fixture, component } = await createComponent(api);

    expect(component.state()).toBe('suspended');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Account suspended');
    expect(text).toContain('Ownership removed after moderation.');
    // Create/Submit/Edit hidden for a suspended owner; only the read-only banner + list remain.
    expect(text).not.toContain('Add listing');
    expect(text).not.toContain('Submit');
    expect(text).not.toContain('Edit');
  });

  it('publish success updates the row in place and closes the dialog', async () => {
    const draft = listing({ id: 'l-1', status: 'draft' });
    const api = apiStub({});
    api.listListings = () => Promise.resolve([draft]);
    api.publishListing = () => Promise.resolve({ ...draft, status: 'pending_review' });

    const { component } = await createComponent(api);
    component.openPublishDialog(draft);
    expect(component.publishTarget()).not.toBeNull();

    await component.confirmPublish();

    expect(component.publishTarget()).toBeNull();
    expect(component.listings()[0].status).toBe('pending_review');
  });

  it('shows the readable Missing list on publish 422 fieldErrors', async () => {
    const draft = listing({ id: 'l-1', status: 'draft', photos: [], amenities: [] });
    const api = apiStub({});
    api.listListings = () => Promise.resolve([draft]);
    api.publishListing = () => Promise.reject(new ApiError(422, 'validation', 'Incomplete', [
      { field: 'photos', message: 'At least one photo is required' },
      { field: 'amenities', message: 'At least one amenity is required' },
    ]));

    const { fixture, component } = await createComponent(api);
    component.openPublishDialog(draft);
    await component.confirmPublish();
    fixture.detectChanges();

    expect(component.publishTarget()).not.toBeNull();       // dialog stays open
    expect(component.publishMissing()).toEqual([
      'At least one photo is required',
      'At least one amenity is required',
    ]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('At least one photo is required');
  });

  it('shows the server message on publish 409', async () => {
    const published = listing({ id: 'l-1', status: 'published' });
    const api = apiStub({});
    api.listListings = () => Promise.resolve([published]);
    api.publishListing = () => Promise.reject(new ApiError(409, 'conflict', 'Only draft or paused listings can be submitted'));

    const { component } = await createComponent(api);
    component.openPublishDialog(published);
    await component.confirmPublish();

    expect(component.publishMessage()).toContain('Only draft or paused listings');
    expect(component.publishTarget()).not.toBeNull();
  });

  it('clamps vacancy display to 0..total_slots', async () => {
    const api = apiStub({});
    api.listListings = () => Promise.resolve([
      listing({ id: 'l-1', total_slots: 4, available_slots: -3 }),   // clamped to 0
      listing({ id: 'l-2', total_slots: 4, available_slots: 99 }),   // clamped to 4
    ]);

    const { fixture, component } = await createComponent(api);

    const vac = component.clampedVacancy(component.listings()[0]);
    expect(vac.available).toBe(0);
    expect(vac.total).toBe(4);

    const vac2 = component.clampedVacancy(component.listings()[1]);
    expect(vac2.available).toBe(4);
    expect(vac2.total).toBe(4);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('0/4');
    expect(text).toContain('4/4');
  });

  it('shows no publish button for removed listings (view only)', async () => {
    const api = apiStub({});
    api.listListings = () => Promise.resolve([
      listing({ id: 'l-1', status: 'removed', moderation_note: 'Removed by moderation' }),
      listing({ id: 'l-2', status: 'published' }),
    ]);

    const { fixture, component } = await createComponent(api);

    expect(component.state()).toBe('ready');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Removed');
    expect(text).toContain('Removed by moderation');
    // Removed rows show only "View" — never Submit (no publish action) and never Edit.
    expect(text).toContain('View');
    expect(text).not.toContain('Submit');
  });

  it('falls back to the placeholder and revokes object URLs on destroy', async () => {
    const photo = {
      id: 'p-1', listing_id: 'l-1', storage_path: 'l-1/p-1.jpg',
      sort_order: 0, is_primary: true, is_approved: false, created_at: '2026-01-01T00:00:00Z',
    };
    const api = apiStub({});
    api.listListings = () => Promise.resolve([listing({ id: 'l-1', photos: [photo] })]);

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-1');
    api.getPhotoBlob = () => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' }));

    const { fixture, component } = await createComponent(api);

    // Object URL is created and wired to the row.
    expect(createSpy).toHaveBeenCalled();
    expect(component.thumbnails()['l-1']).toBe('blob:mock-1');
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img?.src).toContain('blob:mock-1');

    // Destroy revokes every object URL.
    fixture.destroy();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-1');

    revokeSpy.mockRestore();
    createSpy.mockRestore();
  });

  it('falls back to the placeholder when the photo blob fails', async () => {
    const photo = {
      id: 'p-1', listing_id: 'l-1', storage_path: 'l-1/p-1.jpg',
      sort_order: 0, is_primary: true, is_approved: false, created_at: '2026-01-01T00:00:00Z',
    };
    const api = apiStub({});
    api.listListings = () => Promise.resolve([listing({ id: 'l-1', photos: [photo] })]);
    api.getPhotoBlob = () => Promise.reject(new ApiError(404, 'notfound', 'Photo not found'));

    const { fixture, component } = await createComponent(api);

    expect(component.thumbnails()['l-1']).toBeUndefined();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No photo');
  });
});
