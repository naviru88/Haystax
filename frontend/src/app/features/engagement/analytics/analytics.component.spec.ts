import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsComponent } from './analytics.component';
import { EngagementApiService } from '../services/engagement-api.service';
import { of, throwError } from 'rxjs';
import { AnalyticsSummary } from '../../../core/models/review.model';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let apiServiceMock: any;

  const mockSummary: AnalyticsSummary = {
    listingId: 'b1111111-0000-0000-0000-000000000101',
    totalInquiries: 8,
    totalBookings: 5,
    occupancyRate: 75.0,
    estimatedRevenue: 45000,
    averageRating: 4.8
  };

  beforeEach(async () => {
    apiServiceMock = {
      getAnalyticsSummary: vi.fn().mockReturnValue(of(mockSummary))
    };

    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [{ provide: EngagementApiService, useValue: apiServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsComponent);
    component = fixture.componentInstance;
  });

  it('should load analytics summary on init', () => {
    fixture.detectChanges();
    expect(component.summary.totalInquiries).toBe(8);
    expect(component.summary.totalBookings).toBe(5);
    expect(component.summary.occupancyRate).toBe(75.0);
    expect(component.loading).toBeFalsy();
  });

  it('should handle error when unauthorized', () => {
    apiServiceMock.getAnalyticsSummary.mockReturnValue(throwError(() => ({ status: 403 })));
    component.loadAnalytics();

    expect(component.errorMessage).toContain('Ensure you have owner access');
    expect(component.loading).toBeFalsy();
  });
});
