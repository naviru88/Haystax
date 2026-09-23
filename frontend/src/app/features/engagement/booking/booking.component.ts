import { Component, OnInit } from '@angular/core';
import { EngagementApiService } from '../services/engagement-api.service';
import { TenancyRequest, CreateTenancyPayload } from '../../../core/models/tenancy.model';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  bookings: TenancyRequest[] = [];
  loading = true;
  errorMessage = '';
  submitting = false;

  newBooking: CreateTenancyPayload = {
    listingId: 'listing-101',
    studentId: 'student-01',
    moveInDate: '',
    notes: ''
  };

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading = true;
    this.apiService.getBookings('student-01').subscribe({
      next: (data) => {
        this.bookings = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load bookings.';
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

    this.apiService.createBooking(this.newBooking).subscribe({
      next: (created) => {
        this.bookings.unshift(created);
        this.submitting = false;
        this.newBooking.moveInDate = '';
        this.newBooking.notes = '';
      },
      error: () => {
        this.errorMessage = 'Failed to submit booking request.';
        this.submitting = false;
      }
    });
  }
}
