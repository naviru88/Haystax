import { Injectable, signal } from '@angular/core';
import listingsJson from '../mocks/listings.json';
import { Listing, PaginatedListings, SearchFilters } from '../models/listing.model';

@Injectable({ providedIn: 'root' })
export class DiscoveryApiService {
  private readonly allListings: Listing[] = listingsJson as Listing[];

  readonly listings = signal<Listing[]>(this.allListings);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  getPublished(): Listing[] {
    return this.allListings.filter(l => l.status === 'published');
  }

  getById(id: string): Listing | undefined {
    return this.getPublished().find(l => l.id === id);
  }

  search(filters: SearchFilters = {}): PaginatedListings {
    let items = this.getPublished();

    if (filters.city) {
      items = items.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
    }
    if (filters.minPrice != null) {
      items = items.filter(l => l.priceAmount >= filters.minPrice!);
    }
    if (filters.maxPrice != null) {
      items = items.filter(l => l.priceAmount <= filters.maxPrice!);
    }
    if (filters.genderPolicy) {
      items = items.filter(l => l.genderPolicy === filters.genderPolicy);
    }

    switch (filters.sort) {
      case 'price_asc':
        items = [...items].sort((a, b) => a.priceAmount - b.priceAmount);
        break;
      case 'price_desc':
        items = [...items].sort((a, b) => b.priceAmount - a.priceAmount);
        break;
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const start = (page - 1) * pageSize;

    return { items: items.slice(start, start + pageSize), total: items.length };
  }

  getFeatured(limit = 6): Listing[] {
    return [...this.getPublished()]
      .sort((a, b) => (b.ratingSummary?.averageRating ?? 0) - (a.ratingSummary?.averageRating ?? 0))
      .slice(0, limit);
  }

  getRecommendations(limit = 6): Listing[] {
    return [...this.getPublished()]
      .filter(l => l.availableSlots > 0)
      .sort((a, b) => (b.ratingSummary?.averageRating ?? 0) - (a.ratingSummary?.averageRating ?? 0))
      .slice(0, limit);
  }
}
