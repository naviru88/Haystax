export type GenderPolicy = 'any' | 'female_only' | 'male_only';
export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'paused' | 'removed';

export interface Amenity {
  id: string;
  code: string;
  name: string;
}

export interface ListingPhoto {
  id: string;
  storagePath: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface RatingSummary {
  reviewCount: number;
  averageRating: number;
  distribution: Record<string, number>;
}

export interface Preference {
  id: string;
  code: string;
  name: string;
  isRequired: boolean;
  notes?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  city: string;
  district?: string;
  locationLabel?: string;
  lat: number;
  lng: number;
  priceAmount: number;
  currencyCode: string;
  genderPolicy: GenderPolicy;
  totalSlots: number;
  availableSlots: number;
  status: ListingStatus;
  ownerDisplayName: string;
  amenities: Amenity[];
  photos: ListingPhoto[];
  preferences: Preference[];
  ratingSummary?: RatingSummary;
  distanceKm?: number;
}

export interface SearchFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  genderPolicy?: GenderPolicy;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'title_asc';
  page?: number;
  pageSize?: number;
}

export type DiscoveryView = 'recommended' | 'all';

export interface PaginatedListings {
  items: Listing[];
  total: number;
}
