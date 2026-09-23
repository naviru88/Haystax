import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  totalInquiries = 24;
  totalBookings = 18;
  occupancyRate = 85.5;
  estimatedRevenue = 45000;
  averageRating = 4.7;

  constructor() {}

  ngOnInit(): void {}
}
