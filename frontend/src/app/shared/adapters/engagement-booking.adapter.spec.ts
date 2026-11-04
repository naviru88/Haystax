import {
  EngagementTenancyDto,
  mapBookingStatus,
  mapTenanciesToBookingSummaries,
  mapTenancyToBookingSummary,
} from './engagement-booking.adapter';

/** Shapes mirror docs/api-contracts/openapi-engagement.yaml `Tenancy` exactly (camelCase). */
function dto(overrides: Partial<EngagementTenancyDto> = {}): EngagementTenancyDto {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000101',
    listingId: 'b1111111-0000-0000-0000-000000000101',
    tenantId: 'u1111111-0000-0000-0000-000000000001',
    ownerId: 'u1111111-0000-0000-0000-000000000002',
    moveInDate: '2026-11-01',
    status: 'submitted',
    createdAt: '2026-10-29T00:00:00Z',
    ...overrides,
  };
}

describe('engagement booking adapter (D-ADAPTERS)', () => {
  it('maps an M3 Tenancy onto the local owner model', () => {
    const summary = mapTenancyToBookingSummary(dto(), {
      listingTitles: { 'b1111111-0000-0000-0000-000000000101': 'Kandy Boarding' },
      tenantNames: { 'u1111111-0000-0000-0000-000000000001': 'Rashmi Perera' },
    });

    expect(summary).toEqual({
      id: 'a1b2c3d4-0000-0000-0000-000000000101',
      listingId: 'b1111111-0000-0000-0000-000000000101',
      listingTitle: 'Kandy Boarding',
      tenantDisplayName: 'Rashmi Perera',
      requestedAt: '2026-10-29T00:00:00Z',
      status: 'pending',
    });
    // The wire DTO never leaks into the page model.
    expect(summary).not.toHaveProperty('tenantId');
    expect(summary).not.toHaveProperty('moveInDate');
  });

  it('falls back to readable labels when the peer sends ids only', () => {
    const summary = mapTenancyToBookingSummary(dto());

    expect(summary.listingTitle).toBe('Listing b1111111');
    expect(summary.tenantDisplayName).toBe('Tenant u1111111');
  });

  it('maps every M3 BookingStatus value onto a local status', () => {
    expect(mapBookingStatus('submitted')).toBe('pending');
    expect(mapBookingStatus('approved')).toBe('confirmed');
    expect(mapBookingStatus('active')).toBe('confirmed');
    expect(mapBookingStatus('rejected')).toBe('rejected');
    expect(mapBookingStatus('cancelled')).toBe('rejected');
    expect(mapBookingStatus('ended')).toBe('ended');
    expect(mapBookingStatus('something-new')).toBe('pending');   // forward compatible
  });

  it('accepts the paginated envelope and a bare array, and drops malformed rows', () => {
    const rows = [dto({ id: 'a' }), { nope: true }, null, dto({ id: 'b' })];

    expect(mapTenanciesToBookingSummaries({ content: rows }).map(r => r.id)).toEqual(['a', 'b']);
    expect(mapTenanciesToBookingSummaries([dto({ id: 'c' })]).map(r => r.id)).toEqual(['c']);
    expect(mapTenanciesToBookingSummaries(null)).toEqual([]);
    expect(mapTenanciesToBookingSummaries({})).toEqual([]);
    expect(mapTenanciesToBookingSummaries('not json')).toEqual([]);
  });

  it('orders pending requests first, newest first', () => {
    const mapped = mapTenanciesToBookingSummaries([
      dto({ id: 'old', status: 'submitted', createdAt: '2026-10-01T00:00:00Z' }),
      dto({ id: 'new', status: 'submitted', createdAt: '2026-10-05T00:00:00Z' }),
      dto({ id: 'done', status: 'approved', createdAt: '2026-10-09T00:00:00Z' }),
    ]);

    expect(mapped.map(r => r.id)).toEqual(['new', 'old', 'done']);
  });
});
