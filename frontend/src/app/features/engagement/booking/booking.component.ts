import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngagementApiService } from '../services/engagement-api.service';
import { TenancyRequest, CreateTenancyPayload } from '../../../core/models/tenancy.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StateViewComponent } from '../../../shared/components/state-view/state-view.component';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    StateViewComponent,
    SkeletonCardComponent
  ],
  templateUrl: './booking.component.html'
})
export class BookingComponent implements OnInit {
  bookings: TenancyRequest[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  submitting = false;

  newBooking: CreateTenancyPayload = {
    listingId: 'b1111111-0000-0000-0000-000000000101',
    moveInDate: '',
    endDate: '',
    notes: ''
  };

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading = true;
    this.errorMessage = '';
    this.apiService.getBookings('u1111111-0000-0000-0000-000000000001').subscribe({
      next: (response) => {
        this.bookings = response?.content || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load bookings from server.';
        this.loading = false;
      }
    });
  }

  submitBooking(): void {
    if (!this.newBooking.moveInDate) {
      this.errorMessage = 'Please select a valid move-in date.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const idempotencyKey = `idemp-${Date.now()}`;

    this.apiService.createBooking(this.newBooking, idempotencyKey).subscribe({
      next: (created) => {
        this.bookings.unshift(created);
        this.submitting = false;
        this.successMessage = 'Booking inquiry created successfully!';
        this.newBooking.moveInDate = '';
        this.newBooking.endDate = '';
        this.newBooking.notes = '';
      },
      error: (err) => {
        if (err.status === 409) {
          this.errorMessage = 'Conflict: this listing is already booked or requested for the selected period.';
        } else {
          this.errorMessage = 'Failed to submit booking request. Please check inputs and try again.';
        }
        this.submitting = false;
      }
    });
  }

  cancelBooking(booking: TenancyRequest): void {
    if (!confirm('Are you sure you want to cancel this booking request?')) {
      return;
    }

    this.apiService.updateTenancyStatus(booking.id, 'cancelled').subscribe({
      next: (updated) => {
        booking.status = updated.status;
        this.successMessage = 'Booking was cancelled.';
      },
      error: () => {
        this.errorMessage = 'Failed to cancel booking.';
      }
    });
  }
}
