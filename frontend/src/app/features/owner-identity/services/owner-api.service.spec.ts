import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { OwnerApiService } from './owner-api.service';
import { ListingWrite } from '../models/owner-listing.model';
import { environment } from '../../../../environments/environment';

/**
 * W4-C3 — payload / security audit at the wire level (AGENTS-W4 §5 W4-C3.1).
 *
 * The security boundary is the backend, but the client must never even *offer* the fields
 * that decide ownership or moderation state. These tests assert the exact JSON that leaves
 * the browser for the two listing mutations.
 */
const WRITE: ListingWrite = {
  title: 'Kandy Boarding',
  description: 'A room near campus.',
  address_line_1: '1 Main St',
  city: 'Kandy',
  price_amount: 25000,
  currency_code: 'LKR',
  gender_policy: 'any',
  total_slots: 4,
  available_slots: 2,
  amenity_ids: [],
  rules: [],
};

describe('OwnerApiService wire payloads', () => {
  let service: OwnerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OwnerApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(OwnerApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('createListing posts only the contract body — no owner_id, no status', async () => {
    const promise = service.createListing(WRITE);

    const req = http.expectOne(`${environment.apiBaseUrl}/api/owner/listings`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(WRITE);
    expect(req.request.body).not.toHaveProperty('owner_id');
    expect(req.request.body).not.toHaveProperty('status');

    req.flush({ id: 'l-1', ...WRITE, owner_id: 'server-decided', status: 'draft' });
    await promise;
  });

  it('updateListing never sends a client-chosen status', async () => {
    const promise = service.updateListing('l-1', WRITE);

    const req = http.expectOne(`${environment.apiBaseUrl}/api/owner/listings/l-1`);
    expect(req.request.method).toBe('PUT');
    expect(Object.keys(req.request.body)).toEqual(Object.keys(WRITE));

    req.flush({ id: 'l-1', ...WRITE, owner_id: 'server-decided', status: 'published' });
    await promise;
  });

  it('publishListing sends an empty body (the transition is server-side)', async () => {
    const promise = service.publishListing('l-1');

    const req = http.expectOne(`${environment.apiBaseUrl}/api/owner/listings/l-1/publish`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});

    req.flush({ id: 'l-1', ...WRITE, owner_id: 'server-decided', status: 'pending_review' });
    await promise;
  });
});
