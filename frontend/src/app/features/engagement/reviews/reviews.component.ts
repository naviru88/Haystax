import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngagementApiService } from '../services/engagement-api.service';
import { ReviewItem, ReviewCreateRequest } from '../../../core/models/review.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    StateViewComponent,
    SkeletonCardComponent,
    RatingStarsComponent
  ],
  templateUrl: './reviews.component.html'
})
export class ReviewsComponent implements OnInit {
  reviews: ReviewItem[] = [];
  listingId = 'b1111111-0000-0000-0000-000000000101';
  tenancyId = 'a1b2c3d4-0000-0000-0000-000000000002';

  loading = true;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  newReview: ReviewCreateRequest = {
    listingId: this.listingId,
    tenancyId: this.tenancyId,
    rating: 5,
    title: '',
    body: ''
  };

  ownerReplyTexts: Record<string, string> = {};

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    this.errorMessage = '';
    this.apiService.getReviews(this.listingId).subscribe({
      next: (response) => {
        this.reviews = response?.content || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load reviews for this listing.';
        this.loading = false;
      }
    });
  }

  submitReview(): void {
    if (!this.newReview.body.trim()) {
      this.errorMessage = 'Please write a review comment.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.submitReview(this.newReview).subscribe({
      next: (created) => {
        this.reviews.unshift(created);
        this.submitting = false;
        this.successMessage = 'Your review was published successfully!';
        this.newReview.title = '';
        this.newReview.body = '';
      },
      error: (err) => {
        if (err.status === 403 || err.status === 401) {
          this.errorMessage = 'Only tenants with an active or confirmed tenancy can review this property.';
        } else {
          this.errorMessage = 'Failed to submit review. Each tenancy can only be reviewed once.';
        }
        this.submitting = false;
      }
    });
  }

  submitOwnerReply(reviewId: string): void {
    const reply = this.ownerReplyTexts[reviewId];
    if (!reply || !reply.trim()) return;

    this.apiService.respondToReview(reviewId, reply.trim()).subscribe({
      next: (updated) => {
        const item = this.reviews.find(r => r.id === reviewId);
        if (item) item.ownerResponse = updated.ownerResponse;
        this.ownerReplyTexts[reviewId] = '';
        this.successMessage = 'Owner response posted!';
      },
      error: () => {
        this.errorMessage = 'Failed to post owner response.';
      }
    });
  }
}
