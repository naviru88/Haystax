export interface AdminStats {
  submittedReportCount: number;
  underReviewReportCount: number;
  resolvedReportCount: number;
  rejectedReportCount: number;
  pendingListingCount: number;
  removedListingCount: number;
  suspendedUserCount: number;
  publishedListingCount: number;
  activeTenancyCount: number;
  totalUserCount: number;
}

export interface DailyActivity {
  day: string;               // ISO date, e.g. "2026-09-27"
  searches: number;
  listingViews: number;
  filtersApplied: number;
  recommendationViews: number;
  listingContacts: number;
}
