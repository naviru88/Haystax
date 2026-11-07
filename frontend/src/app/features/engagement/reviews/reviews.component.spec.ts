import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewsComponent } from './reviews.component';
import { EngagementApiService } from '../services/engagement-api.service';
import { of, throwError } from 'rxjs';
import { ReviewItem, PageResponse } from '../../../core/models/review.model';

describe('ReviewsComponent', () => {
  let component: ReviewsComponent;
  let fixture: ComponentFixture<ReviewsComponent>;
  let apiServiceMock: any;

  const mockReview: ReviewItem = {
    id: 'r-1',
    listingId: 'b1111111-0000-0000-0000-000000000101',
    authorId: 'u1111111-0000-0000-0000-000000000001',
    tenancyId: 't-1',
    rating: 5,
    title: 'Great accommodation',
    body: 'Clean and tidy place',
    status: 'published',
    createdAt: '2026-10-01T00:00:00Z'
  };

  const mockPage: PageResponse<ReviewItem> = {
    content: [mockReview],
    page: { page: 0, size: 20, totalElements: 1, totalPages: 1 }
  };

  beforeEach(async () => {
    apiServiceMock = {
      getReviews: vi.fn().mockReturnValue(of(mockPage)),
      submitReview: vi.fn(),
      respondToReview: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [{ provide: EngagementApiService, useValue: apiServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewsComponent);
    component = fixture.componentInstance;
  });

  it('should load reviews on init', () => {
    fixture.detectChanges();
    expect(component.reviews.length).toBe(1);
    expect(component.loading).toBeFalsy();
  });

  it('should post a new review', () => {
    fixture.detectChanges();
    component.newReview.body = 'Awesome experience';
    apiServiceMock.submitReview.mockReturnValue(of({
      ...mockReview,
      id: 'r-2',
      body: 'Awesome experience'
    }));

    component.submitReview();

    expect(component.reviews.length).toBe(2);
    expect(component.successMessage).toContain('published');
  });

  it('should handle permission error when unauthorized tenant reviews', () => {
    fixture.detectChanges();
    component.newReview.body = 'Not allowed';
    apiServiceMock.submitReview.mockReturnValue(throwError(() => ({ status: 403 })));

    component.submitReview();

    expect(component.errorMessage).toContain('Only tenants');
    expect(component.submitting).toBeFalsy();
  });
});
