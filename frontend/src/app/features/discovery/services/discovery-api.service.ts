import { Injectable, signal } from '@angular/core';
import listingsJson from '../mocks/listings.json';
import reviewsJson from '../mocks/reviews.json';
import {
  DiscoveryView,
  Listing,
  PaginatedListings,
  SearchFilters,
} from '../models/listing.model';
import { Review } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class DiscoveryApiService {
  private readonly allListings: Listing[] = listingsJson as Listing[];
  private readonly allReviews: Review[] = reviewsJson as Review[];

  readonly listings = signal<Listing[]>(this.allListings);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Reads
  getPublished(): Listing[] {
    return this.allListings.filter(l => l.status === 'published');
  }

  getById(id: string): Listing | undefined {
    return this.getPublished().find(l => l.id === id);
  }

  /** Reviews for a listing, newest first. Empty array if none. */
  getReviewsForListing(listingId: string): Review[] {
    return this.allReviews
      .filter(r => r.listingId === listingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // Search

  /** Legacy direct search (kept for backward compatibility). */
  search(filters: SearchFilters = {}): PaginatedListings {
    const filtered = this.applyFilters(this.getPublished(), filters);
    const sorted = this.applySort(filtered, filters.sort);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return { items: sorted.slice(start, start + pageSize), total: sorted.length };
  }

  listByView(view: DiscoveryView, filters: SearchFilters = {}): PaginatedListings {
    // 1. Filter the pool.
    let pool = this.applyFilters(this.getPublished(), filters);

    // 2. View-scoped pre-filter: recommended hides full listings, but only when the user hasn't overridden the ordering with an explicit sort.
    if (view === 'recommended' && (!filters.sort || filters.sort === 'relevance')) {
      pool = pool.filter(l => l.availableSlots > 0);
    }

    // 3. Order.
    let ordered: Listing[];
    if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
      ordered = this.applySort(pool, filters.sort);
    } else if (view === 'recommended') {
      // relevance for recommended = highest rating first, ties broken by availability
      ordered = [...pool].sort((a, b) => {
        const ratingDiff =
          (b.ratingSummary?.averageRating ?? 0) - (a.ratingSummary?.averageRating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return b.availableSlots - a.availableSlots;
      });
    } else {
      // relevance for all = alphabetical A–Z
      ordered = [...pool].sort((a, b) => a.title.localeCompare(b.title));
    }

    // 4. Paginate.
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 12;
    const start = (page - 1) * pageSize;
    return { items: ordered.slice(start, start + pageSize), total: ordered.length };
  }

  // Featured / recommendations (kept for any other consumers)
  getFeatured(limit = 6): Listing[] {
    return [...this.getPublished()]
      .sort(
        (a, b) =>
          (b.ratingSummary?.averageRating ?? 0) - (a.ratingSummary?.averageRating ?? 0)
      )
      .slice(0, limit);
  }

  getRecommendations(limit = 6): Listing[] {
    return [...this.getPublished()]
      .filter(l => l.availableSlots > 0)
      .sort(
        (a, b) =>
          (b.ratingSummary?.averageRating ?? 0) - (a.ratingSummary?.averageRating ?? 0)
      )
      .slice(0, limit);
  }

  // Internals
  private applyFilters(items: Listing[], filters: SearchFilters): Listing[] {
    let out = items;
    if (filters.city) {
      out = out.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
    }
    if (filters.minPrice != null) {
      out = out.filter(l => l.priceAmount >= filters.minPrice!);
    }
    if (filters.maxPrice != null) {
      out = out.filter(l => l.priceAmount <= filters.maxPrice!);
    }
    if (filters.genderPolicy) {
      out = out.filter(l => l.genderPolicy === filters.genderPolicy);
    }
    return out;
  }

  private applySort(items: Listing[], sort: SearchFilters['sort']): Listing[] {
    switch (sort) {
      case 'price_asc':
        return [...items].sort((a, b) => a.priceAmount - b.priceAmount);
      case 'price_desc':
        return [...items].sort((a, b) => b.priceAmount - a.priceAmount);
      default:
        return [...items];
    }
  }
}
