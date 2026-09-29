import { Component, input, output } from '@angular/core';
import { GenderPolicy, SearchFilters } from '../../models/listing.model';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent {
  readonly filters = input.required<SearchFilters>();
  readonly filtersChange = output<SearchFilters>();

  readonly cities = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Anuradhapura'];

  readonly genderOptions: { value: GenderPolicy | ''; label: string }[] = [
    { value: '', label: 'Any' },
    { value: 'any', label: 'Any gender' },
    { value: 'female_only', label: 'Female only' },
    { value: 'male_only', label: 'Male only' },
  ];

  readonly sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
  ];

  update<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void {
    const next: SearchFilters = {
      ...this.filters(),
      [key]: value === '' ? undefined : value,
    };
    this.filtersChange.emit(next);
  }

  clear(): void {
    this.filtersChange.emit({});
  }
}
