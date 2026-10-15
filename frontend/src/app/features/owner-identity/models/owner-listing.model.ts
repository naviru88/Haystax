/**
 * Owner & Identity — listing models.
 * Field names are aligned with features/discovery/models/listing.model.ts
 * (read for alignment, NOT imported — AGENTS §1 rule between members).
 * DB sources: [DB boarding_listings.*], [DB listing_photos], [DB amenities], [DB listing_rules].
 */
export type GenderPolicy = 'any' | 'female_only' | 'male_only';   // [DB boarding_listings.gender_policy]
export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'paused' | 'removed'; // [DB boarding_listings.status]

export interface Amenity {       // [DB amenities]
  id: string;
  code: string;                  // unique seed code
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ListingPhoto {  // [DB listing_photos]
  id: string;
  storagePath: string;           // object path, never a public URL [DB listing_photos.storage_path]
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  isApproved: boolean;
}

export interface ListingRule {   // [DB listing_rules]
  id: string;
  ruleCode: string;
  label: string;
  isAllowed: boolean;
  notes?: string;
}

export interface OwnerListing {  // [DB boarding_listings.*]
  id: string;
  ownerId: string;               // server-set only — never from the client [AGENTS §0 rule 5]
  title: string;
  description: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  locationLabel?: string;
  lat: number;                   // location (PostGIS point) — not mapped server-side in Week 1 [TODO]
  lng: number;
  priceAmount: number;
  currencyCode: string;
  genderPolicy: GenderPolicy;
  totalSlots: number;
  availableSlots: number;
  status: ListingStatus;
  moderationNote?: string;       // display only — moderation is the admin panel's surface [AGENTS §3]
  publishedAt?: string;
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
  amenities: Amenity[];
  rules: ListingRule[];
  photos: ListingPhoto[];
}

export interface ListingWrite {  // POST/PUT /api/owner/listings — ownerId never in the body [AGENTS §0 rule 5]
  title: string;
  description: string;
  addressLine1: string;
  addressLine2?: string;
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
  amenityIds: string[];
  photoIds: string[];
}

/** Week-1 skeleton UI state, switchable via the mock service. [AGENTS C3] */
export type UiState = 'loading' | 'empty' | 'error' | 'success';
