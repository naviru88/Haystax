export interface ReviewItem {
  id: string;
  listingId: string;
  authorId: string;
  tenancyId: string;
  rating: number;
  title?: string;
  body: string;
  status: 'draft' | 'published' | 'hidden' | 'removed';
  ownerResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewCreateRequest {
  listingId: string;
  tenancyId: string;
  rating: number;
  title?: string;
  body: string;
}

export interface ReviewUpdateRequest {
  rating: number;
  title?: string;
  body: string;
}

export interface AnalyticsSummary {
  id?: string;
  listingId: string;
  from?: string;
  to?: string;
  totalInquiries: number;
  totalBookings: number;
  occupancyRate: number;
  estimatedRevenue: number;
  averageRating: number | null;
}

export interface PageMetadata {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageResponse<T> {
  content: T[];
  page: PageMetadata;
}

