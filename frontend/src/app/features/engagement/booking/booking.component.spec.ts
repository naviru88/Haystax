import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingComponent } from './booking.component';
import { EngagementApiService } from '../services/engagement-api.service';
import { of, throwError } from 'rxjs';
import { TenancyRequest } from '../../../core/models/tenancy.model';
import { PageResponse } from '../../../core/models/review.model';

describe('BookingComponent', () => {
  let component: BookingComponent;
  let fixture: ComponentFixture<BookingComponent>;
  let apiServiceMock: any;

  const mockTenancy: TenancyRequest = {
    id: 't-1',
    listingId: 'b1111111-0000-0000-0000-000000000101',
    tenantId: 'u1111111-0000-0000-0000-000000000001',
    moveInDate: '2026-11-01',
    status: 'pending',
    notes: 'Test note',
    createdAt: '2026-10-01T00:00:00Z'
  };

  const mockPage: PageResponse<TenancyRequest> = {
    content: [mockTenancy],
    page: { page: 0, size: 20, totalElements: 1, totalPages: 1 }
  };

  beforeEach(async () => {
    apiServiceMock = {
      getBookings: vi.fn().mockReturnValue(of(mockPage)),
      createBooking: vi.fn(),
      updateTenancyStatus: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [BookingComponent],
      providers: [{ provide: EngagementApiService, useValue: apiServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingComponent);
    component = fixture.componentInstance;
  });

  it('should load bookings on initialization', () => {
    fixture.detectChanges();
    expect(component.bookings.length).toBe(1);
    expect(component.loading).toBeFalsy();
  });

  it('should submit a new booking successfully', () => {
    fixture.detectChanges();
    component.newBooking.moveInDate = '2026-12-01';
    component.newBooking.notes = 'Moving soon';

    const created: TenancyRequest = {
      ...mockTenancy,
      id: 't-2',
      moveInDate: '2026-12-01'
    };
    apiServiceMock.createBooking.mockReturnValue(of(created));

    component.submitBooking();

    expect(component.bookings.length).toBe(2);
    expect(component.successMessage).toContain('successfully');
  });

  it('should display conflict message on 409 error', () => {
    fixture.detectChanges();
    component.newBooking.moveInDate = '2026-12-01';

    apiServiceMock.createBooking.mockReturnValue(throwError(() => ({ status: 409 })));

    component.submitBooking();

    expect(component.errorMessage).toContain('Conflict');
    expect(component.submitting).toBeFalsy();
  });
});
