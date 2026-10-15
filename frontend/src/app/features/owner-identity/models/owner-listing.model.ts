/**
 * Owner & Identity — listing models.
 * Field names match the OpenAPI contract exactly (snake_case):
 * docs/api-contracts/openapi-owner.yaml (ListingResponse / ListingWriteRequest / ListingRuleWrite /
 * ListingRuleResponse / ListingPhotoResponse / AmenityResponse / GenderPolicy / ListingStatus).
 * DB sources: [DB boarding_listings.*], [DB listing_photos], [DB amenities], [DB listing_rules].
 */
export type GenderPolicy = 'any' | 'female_only' | 'male_only';           // [DB boarding_listings.gender_policy]
export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'paused' | 'removed'; // [DB boarding_listings.status]

export interface Amenity {       // [DB amenities]
  id: string;
  code: string;                  // unique seed code
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ListingPhoto {  // [DB listing_photos]
  id: string;
  listing_id: string;
  storage_path: string;          // object path, never a public URL [DB listing_photos.storage_path]
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface ListingRule {   // [DB listing_rules]
  id: string;
  rule_code: string;
  label: string;
  is_allowed: boolean;
  notes?: string;
}

/** Listing rule as sent in ListingWriteRequest.rules (no id yet). */
export interface ListingRuleWrite {
  rule_code: string;
  label: string;
  is_allowed: boolean;
  notes?: string;
}

export interface LocationPoint { // PostGIS point, geography(Point,4326) [DB boarding_listings.location]
  lat: number;
  lng: number;
}

export interface OwnerListing {  // [DB boarding_listings.*] + relations
  id: string;
  owner_id: string;              // server-set only — never from the client [AGENTS §0 rule 5]
  title: string;
  description: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  district?: string;
  location_label?: string;
  location?: LocationPoint | null;
  price_amount: number;
  currency_code: string;
  gender_policy: GenderPolicy;
  total_slots: number;
  available_slots: number;
  status: ListingStatus;
  moderation_note?: string;      // display only — moderation is the admin panel's surface [AGENTS §3]
  published_at?: string;
  removed_at?: string;
  created_at: string;
  updated_at: string;
  photos: ListingPhoto[];
  amenities: Amenity[];
  rules: ListingRule[];
}

/** POST/PUT /api/owner/listings body. owner_id and status NEVER exist here. [AGENTS §0 rule 5] */
export interface ListingWrite {
  title: string;
  description: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  district?: string;
  location_label?: string;
  location?: LocationPoint | null;
  price_amount: number;
  currency_code: string;
  gender_policy: GenderPolicy;
  total_slots: number;
  available_slots: number;
  amenity_ids: string[];
  rules: ListingRuleWrite[];
}

/** Upload metadata for POST /api/owner/listings/{id}/photos (multipart fields). */
export interface PhotoUploadMeta {
  is_primary?: boolean;
  alt_text?: string;
  sort_order?: number;
}

/** uploadPhoto() emits progress events then a final done event. */
export type PhotoUploadEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; photo: ListingPhoto };

/** Week-1 skeleton UI state (mock switchable). C2 replaces this with real page states. [AGENTS C3] */
export type UiState = 'loading' | 'empty' | 'error' | 'success';
