import { Component, computed, input, output, signal } from '@angular/core';
import { GenderPolicy, SearchFilters } from '../../models/listing.model';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent {
  readonly filters = input.required<SearchFilters>();
  readonly filtersChange = output<SearchFilters>();

  //Full A–Z list of Sri Lankan cities and towns.
  readonly allCities: string[] = [
    'Agalawatta', 'Ahangama', 'Ahungalla', 'Akkaraipattu', 'Akuressa',
    'Alawwa', 'Aluthgama', 'Ambalangoda', 'Ambalantota', 'Ampara',
    'Anamaduwa', 'Angunakolapelessa', 'Anuradhapura', 'Aranayaka', 'Athurugiriya',
    'Attanagalla', 'Avissawella', 'Ayagama', 'Baddegama', 'Badulla',
    'Balangoda', 'Bandaragama', 'Bandarawela', 'Battaramulla', 'Batticaloa',
    'Beliatta', 'Bentota', 'Beruwala', 'Biyagama', 'Boralesgamuwa',
    'Bulathsinhala', 'Chavakachcheri', 'Chilaw', 'Colombo', 'Dambulla',
    'Dankotuwa', 'Dehiowita', 'Dehiwala', 'Deniyaya', 'Deraniyagala',
    'Dikwella', 'Divulapitiya', 'Diyatalawa', 'Eheliyagoda', 'Ella',
    'Elpitiya', 'Embilipitiya', 'Eravur', 'Galewela', 'Galle',
    'Gampaha', 'Gampola', 'Ganemulla', 'Ginigathhena', 'Giriulla',
    'Habarana', 'Hakmana', 'Hambantota', 'Hanwella', 'Haputale',
    'Hatton', 'Hikkaduwa', 'Hingurakgoda', 'Homagama', 'Horana',
    'Ibbagamuwa', 'Ingiriya', 'Jaffna', 'Ja-Ela', 'Kadawatha',
    'Kaduwela', 'Kalawana', 'Kalmunai', 'Kalutara', 'Kamburupitiya',
    'Kandy', 'Karapitiya', 'Katunayake', 'Kegalle', 'Kekirawa',
    'Kilinochchi', 'Kiribathgoda', 'Kothmale', 'Kottawa', 'Kuliyapitiya',
    'Kurunegala', 'Maharagama', 'Mahiyanganaya', 'Malabe', 'Mannar',
    'Marawila', 'Matale', 'Matara', 'Mathugama', 'Mawanella',
    'Minuwangoda', 'Monaragala', 'Moratuwa', 'Mullaitivu', 'Nawalapitiya',
    'Negombo', 'Nittambuwa', 'Nochchiyagama', 'Nugegoda', 'Nuwara Eliya',
    'Oruwala', 'Opanayaka', 'Padukka', 'Panadura', 'Peliyagoda',
    'Peradeniya', 'Piliyandala', 'Point Pedro', 'Polonnaruwa', 'Puttalam',
    'Ragama', 'Rambukkana', 'Ratnapura', 'Ruwanwella', 'Seeduwa',
    'Sri Jayawardenepura Kotte', 'Tangalle', 'Thalawakele', 'Thanamalwila',
    'Thihariya', 'Trincomalee', 'Valvettithurai', 'Vavuniya', 'Veyangoda',
    'Wadduwa', 'Warakapola', 'Wattala', 'Weligama', 'Welimada',
    'Wellawaya', 'Wenappuwa', 'Yakkala', 'Yakkalamulla', 'Yatiyantota',
  ];

  // City combobox state
  readonly cityOpen = signal(false);
  readonly citySearch = signal('');
  readonly cityHighlight = signal(0);

  readonly filteredCities = computed(() => {
    const q = this.citySearch().toLowerCase().trim();
    const all = this.allCities;
    if (!q) return all;
    return all.filter(c => c.toLowerCase().includes(q));
  });

  readonly cityLabel = computed(() => this.filters().city || 'All cities');

  // Other filter options
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

  // City combobox actions
  toggleCity(): void {
    if (this.cityOpen()) {
      this.cityOpen.set(false);
    } else {
      this.cityOpen.set(true);
      this.citySearch.set('');
      this.cityHighlight.set(0);
      setTimeout(() => {
        document.getElementById('city-search-input')?.focus();
      }, 0);
    }
  }

  onCitySearchInput(event: Event): void {
    this.citySearch.set((event.target as HTMLInputElement).value);
    this.cityHighlight.set(0);
  }

  pickCity(city: string): void {
    this.update('city', city);
    this.cityOpen.set(false);
  }

  clearCity(): void {
    this.update('city', '');
    this.cityOpen.set(false);
  }

  onCityKeydown(event: KeyboardEvent): void {
    const items = this.filteredCities();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.cityHighlight.update(i => Math.min(i + 1, items.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.cityHighlight.update(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.cityHighlight() === 0) {
          this.clearCity();
        } else {
          const city = items[this.cityHighlight() - 1];
          if (city) this.pickCity(city);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.cityOpen.set(false);
        break;
    }
  }

  //Generic update / clear
  update<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void {
    const next: SearchFilters = {
      ...this.filters(),
      [key]: value === '' ? undefined : value,
    };
    this.filtersChange.emit(next);
  }

  clear(): void {
    this.filtersChange.emit({});
    this.cityOpen.set(false);
  }
}
