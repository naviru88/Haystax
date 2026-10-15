import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { ListingEditorComponent, MAX_PHOTO_BYTES } from './listing-editor.component';
import { OWNER_API, OwnerApi } from '../services/owner-api.interface';
import { ApiError } from '../services/api-error';
import { OwnerUser } from '../models/owner-user.model';
import { Amenity, ListingPhoto, OwnerListing, PhotoUploadEvent } from '../models/owner-listing.model';

const OWNER: OwnerUser = {
  id: 'u-owner', display_name: 'Kavinda Silva', email: 'kavinda@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: false,
};
const SUSPENDED: OwnerUser = {
  id: 'u-susp', display_name: 'Chandana Rajapaksa', email: 'chandana@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: true, suspension_reason: 'dev test',
};
const TENANT: OwnerUser = {
  id: 'u-tenant', display_name: 'Rashmi Perera', email: 'rashmi@student.lk',
  is_owner: false, is_admin: false, is_suspended: false,
};

const AMENITIES: Amenity[] = [
  { id: 'a1', code: 'wifi', name: 'Wi-Fi', is_active: true, sort_order: 1 },
  { id: 'a2', code: 'parking', name: 'Parking', is_active: true, sort_order: 2 },
];

function photo(id = 'p-1', overrides: Partial<ListingPhoto> = {}): ListingPhoto {
  return {
    id, listing_id: 'l-1', storage_path: `l-1/${id}.jpg`, sort_order: 0,
    is_primary: false, is_approved: false, created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function listing(overrides: Partial<OwnerListing> = {}): OwnerListing {
  return {
    id: 'l-1', owner_id: OWNER.id, title: 'Kandy Boarding', description: 'desc',
    address_line_1: '1 Main St', city: 'Kandy', district: 'Kandy', location_label: 'Town',
    location: { lat: 7.29, lng: 80.63 }, price_amount: 25000, currency_code: 'LKR',
    gender_policy: 'any', total_slots: 4, available_slots: 2, status: 'draft',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    photos: [], amenities: [], rules: [],
    ...overrides,
  };
}

/** Full OwnerApi-shaped stub; individual tests override the methods they need. */
function makeApi(): OwnerApi {
  return {
    getMe: () => Promise.resolve(OWNER),
    getListing: () => Promise.resolve(listing()),
    listAmenities: () => Promise.resolve([...AMENITIES]),
    createListing: () => Promise.reject(new Error('not stubbed')),
    updateListing: () => Promise.reject(new Error('not stubbed')),
    publishListing: () => Promise.reject(new Error('not stubbed')),
    uploadPhoto: () => of<PhotoUploadEvent>({ kind: 'done', photo: photo() }),
    deletePhoto: () => Promise.resolve(),
    getPhotoBlob: () => Promise.reject(new Error('no bytes')),
    getMockSessionUser: () => undefined,
  } as unknown as OwnerApi;
}

/** Mount in edit mode for the given listing id. */
async function mount(api: unknown, id = 'l-1', route = `/owner/listings/${id}`): Promise<{
  fixture: import('@angular/core/testing').ComponentFixture<ListingEditorComponent>;
  component: ListingEditorComponent;
}> {
  await TestBed.configureTestingModule({
    imports: [ListingEditorComponent],
    providers: [
      provideRouter([{ path: 'owner/listings/:id', component: ListingEditorComponent }]),
      provideHttpClient(),
      { provide: OWNER_API, useValue: api },
    ],
  }).compileComponents();

  // Real navigation so ActivatedRoute.snapshot.paramMap carries the :id param
  // (TestBed.createComponent would leave it null and every edit-mode test would
  // land in the notFound state).
  const harness = await RouterTestingHarness.create(route);
  const component = await harness.navigateByUrl(route, ListingEditorComponent) as ListingEditorComponent;
  // Drain ngOnInit()'s async load chain deterministically (zoneless tests: whenStable
  // resolves before the promises complete, so we flush microtasks + a macrotask instead).
  for (let i = 0; i < 50; i++) { await Promise.resolve(); }
  await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 50; i++) { await Promise.resolve(); }
  const fixture = harness.fixture as unknown as import('@angular/core/testing').ComponentFixture<ListingEditorComponent>;
  fixture.detectChanges();
  return { fixture, component };
}

/** Fill every required field so the form is valid (create mode). */
function fillValidForm(component: ListingEditorComponent): void {
  component.form.patchValue({
    title: 'A valid boarding title',
    description: 'A description',
    address_line_1: '10 Main St',
    city: 'Colombo',
    lat: 6.9,
    lng: 79.8,
    price_amount: 15000,
    total_slots: 3,
    available_slots: 2,
  });
  component.form.markAllAsTouched();
}

describe('ListingEditorComponent', () => {
  it('edit mode loads the listing and shows title + location in the header', async () => {
    const api = makeApi();
    const { fixture, component } = await mount(api);

    expect(component.state()).toBe('ready');
    expect(component.listing()?.id).toBe('l-1');
    expect(component.form.get('title')?.value).toBe('Kandy Boarding');
    expect(component.form.get('city')?.value).toBe('Kandy');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kandy Boarding');
    expect(text).toContain('Kandy, Kandy');
    expect(text).toContain('Town');
  });

  it('404 from getListing shows the safe not-found state', async () => {
    const api = makeApi();
    api.getListing = () => Promise.reject(new ApiError(404, 'notfound', 'Listing not found'));

    const { fixture, component } = await mount(api);

    expect(component.state()).toBe('notFound');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Listing not found');
  });

  it('suspended owner sees the suspended read-only state', async () => {
    const api = makeApi();
    api.getMe = () => Promise.resolve(SUSPENDED);

    const { fixture, component } = await mount(api);

    expect(component.state()).toBe('suspended');
    expect(component.isReadOnly()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Account suspended');
    expect(text).toContain('dev test');
  });

  it('removed listing is read-only with the moderation note', async () => {
    const api = makeApi();
    api.getListing = () => Promise.resolve(listing({
      status: 'removed', moderation_note: 'Removed by moderation',
    }));

    const { fixture, component } = await mount(api);

    expect(component.state()).toBe('readOnly');
    expect(component.isReadOnly()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Listing removed');
    expect(text).toContain('Removed by moderation');
  });

  describe('validators', () => {
    it('title shorter than 5 chars is invalid', async () => {
      const api = makeApi();
      const { component } = await mount(api);
      component.form.get('title')?.setValue('abcd');
      expect(component.form.get('title')?.valid).toBe(false);
    });

    it('price below 0 is invalid', async () => {
      const api = makeApi();
      const { component } = await mount(api);
      component.form.get('price_amount')?.setValue(-1);
      expect(component.form.get('price_amount')?.valid).toBe(false);
    });

    it('total_slots must be > 0', async () => {
      const api = makeApi();
      const { component } = await mount(api);
      component.form.get('total_slots')?.setValue(0);
      expect(component.form.get('total_slots')?.valid).toBe(false);
    });

    it('cross-field: available_slots > total_slots is invalid', async () => {
      const api = makeApi();
      const { component } = await mount(api);
      component.form.get('total_slots')?.setValue(2);
      component.form.get('available_slots')?.setValue(3);
      expect(component.form.hasError('slotsRange')).toBe(true);
    });

    it('cross-field: available_slots negative is invalid', async () => {
      const api = makeApi();
      const { component } = await mount(api);
      component.form.get('total_slots')?.setValue(4);
      component.form.get('available_slots')?.setValue(-1);
      expect(component.form.hasError('slotsRange')).toBe(true);
    });

    it('lat/lng out of range are invalid', async () => {
      const api = makeApi();
      const { component } = await mount(api);
      component.form.get('lat')?.setValue(91);
      component.form.get('lng')?.setValue(-181);
      expect(component.form.get('lat')?.valid).toBe(false);
      expect(component.form.get('lng')?.valid).toBe(false);
    });
  });

  it('buildPayload never contains owner_id or status, and omits empty rules', async () => {
    const api = makeApi();
    const { component } = await mount(api);

    component.form.get('amenity_ids')?.setValue([true, false]);
    fillValidForm(component);

    const payload = component.buildPayload();
    expect(payload).not.toHaveProperty('owner_id');
    expect(payload).not.toHaveProperty('status');
    expect(payload.amenity_ids).toEqual(['a1']);
    expect(payload.rules).toEqual([]);
    expect(payload.title).toBe('A valid boarding title');
  });

  it('server 422 fieldErrors map onto matching controls; unknown fields go to the form list', async () => {
    const api = makeApi();
    api.updateListing = () => Promise.reject(new ApiError(422, 'validation', 'Incomplete', [
      { field: 'title', message: 'Title must be 5-160 characters' },
      { field: 'unknown_field', message: 'Something else is wrong' },
    ]));

    const { fixture, component } = await mount(api);
    fillValidForm(component);
    component.form.get('title')?.setValue('A very long title that exceeds the maximum allowed length of one hundred and sixty characters for boarding listings yes indeed');

    await component.saveDraft();
    fixture.detectChanges();

    expect(component.form.get('title')?.hasError('server')).toBe(true);
    expect(component.formError()).toContain('Something else is wrong');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something else is wrong');
  });

  it('create mode navigates to the new listing after createListing', async () => {
    const api = makeApi();
    api.createListing = () => Promise.resolve(listing({ id: 'l-new', title: 'A valid boarding title' }));

    const { component } = await mount(api, 'new', '/owner/listings/new');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillValidForm(component);
    await component.saveDraft();

    expect(navigate).toHaveBeenCalledWith(['/owner/listings', 'l-new']);
  });

  it('edit mode save calls updateListing with the payload and shows success', async () => {
    const api = makeApi();
    const updateSpy = vi.fn(() => Promise.resolve(listing({ title: 'Updated Title' })));
    api.updateListing = updateSpy;

    const { fixture, component } = await mount(api);
    fillValidForm(component);
    component.form.get('title')?.setValue('Updated Title');

    await component.saveDraft();
    fixture.detectChanges();

    expect(updateSpy).toHaveBeenCalledWith('l-1', expect.objectContaining({ title: 'Updated Title' }));
    expect(component.savedAt()).not.toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Saved');
  });

  it('publish saves pending edits first, then calls publishListing; 422 shows the Missing list', async () => {
    const api = makeApi();
    api.updateListing = () => Promise.resolve(listing({ title: 'Kandy Boarding Updated' }));
    api.publishListing = () => Promise.reject(new ApiError(422, 'validation', 'Incomplete', [
      { field: 'photos', message: 'At least one photo is required' },
    ]));

    const { fixture, component } = await mount(api);
    fillValidForm(component);
    component.form.get('title')?.setValue('Kandy Boarding Updated');   // dirty form

    await component.submitForPublication();
    fixture.detectChanges();

    expect(component.publishMissing()).toEqual(['At least one photo is required']);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('At least one photo is required');
  });

  describe('photo upload', () => {
    it('client pre-check rejects a wrong file type with a visible error', async () => {
      const api = makeApi();
      const { component } = await mount(api);

      const file = new File(['x'], 'evil.png', { type: 'text/plain' });
      component.onFileSelected({ target: { files: [file], value: '' } } as unknown as Event);

      const uploads = component.uploadsList();
      expect(uploads.length).toBe(1);
      expect(uploads[0].error).toContain('Only JPEG, PNG or WebP');
    });

    it('client pre-check rejects an oversized file with a visible error', async () => {
      const api = makeApi();
      const { component } = await mount(api);

      const file = new File([new ArrayBuffer(MAX_PHOTO_BYTES + 1)], 'big.png', { type: 'image/png' });
      component.onFileSelected({ target: { files: [file], value: '' } } as unknown as Event);

      const uploads = component.uploadsList();
      expect(uploads[0].error).toContain('5 MB');
    });

    it('upload emits progress then done and adds the photo to the listing', async () => {
      const api = makeApi();
      const uploaded = photo('p-new');
      const events: PhotoUploadEvent[] = [
        { kind: 'progress', percent: 40 },
        { kind: 'progress', percent: 90 },
        { kind: 'done', photo: uploaded },
      ];
      api.uploadPhoto = vi.fn(() => of(...events));

      const { component } = await mount(api);
      const file = new File(['x'], 'room.png', { type: 'image/png' });
      component.onFileSelected({ target: { files: [file], value: '' } } as unknown as Event);

      // progress events processed synchronously by the of() emission after subscribe
      expect(component.listing()?.photos.some(p => p.id === 'p-new')).toBe(true);
      const uploads = component.uploadsList();
      expect(uploads.some(u => u.done?.id === 'p-new')).toBe(true);
    });

    it('upload error renders the server message', async () => {
      const api = makeApi();
      api.uploadPhoto = () => new Observable<PhotoUploadEvent>(subscriber => {
        subscriber.error(new ApiError(422, 'validation', 'Not a valid image'));
      });

      const { component } = await mount(api);
      const file = new File(['x'], 'room.png', { type: 'image/png' });
      component.onFileSelected({ target: { files: [file], value: '' } } as unknown as Event);

      const uploads = component.uploadsList();
      expect(uploads.some(u => u.error)).toBe(true);
    });

    it('delete asks for confirmation and removes the photo', async () => {
      const api = makeApi();
      const target = photo('p-1');
      api.getListing = () => Promise.resolve(listing({ photos: [target, photo('p-2')] }));
      const deleteSpy = vi.fn(() => Promise.resolve());
      api.deletePhoto = deleteSpy;

      const { component } = await mount(api);
      component.requestDelete(target);
      expect(component.deleteTarget()).not.toBeNull();

      await component.confirmDelete();

      expect(deleteSpy).toHaveBeenCalledWith('l-1', 'p-1');
      expect(component.deleteTarget()).toBeNull();
      expect(component.listing()?.photos.map(p => p.id)).toEqual(['p-2']);
    });

    it('shows Awaiting approval badge for unapproved photos', async () => {
      const api = makeApi();
      api.getListing = () => Promise.resolve(listing({ photos: [photo('p-1', { is_approved: false })] }));

      const { fixture, component } = await mount(api);
      expect(component.state()).toBe('ready');
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Awaiting approval');
    });

    it('upload is disabled in create mode (create first, then upload)', async () => {
      const api = makeApi();
      const { component } = await mount(api, 'new', '/owner/listings/new');
      expect(component.canUpload()).toBe(false);
    });
  });

  it('dirty-form leave protection asks for confirmation before navigating', async () => {
    const api = makeApi();
    const { component } = await mount(api);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.get('title')?.setValue('Changed but unsaved');
    component.form.get('title')?.markAsDirty();
    component.onLeave();

    expect(component.dirtyLeaving()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    component.confirmLeave();
    expect(navigate).toHaveBeenCalledWith(['/owner/dashboard']);
  });
});
