export interface Review {
  id: string;
  listingId: string;
  authorDisplayName: string;
  rating: number;          // 1–5
  body: string;
  createdAt: string;       // ISO date string
}
