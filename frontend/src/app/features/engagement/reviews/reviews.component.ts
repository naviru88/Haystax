import { Component, OnInit } from '@angular/core';
import { EngagementApiService } from '../services/engagement-api.service';

@Component({
  selector: 'app-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class ReviewsComponent implements OnInit {
  reviews: any[] = [];
  listingId = 'listing-101';

  constructor(private apiService: EngagementApiService) {}

  ngOnInit(): void {
    this.apiService.getReviews(this.listingId).subscribe(data => {
      this.reviews = data;
    });
  }
}
