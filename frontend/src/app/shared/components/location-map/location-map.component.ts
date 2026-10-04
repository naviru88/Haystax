import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  input,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-map',
  template: `
    <div class="relative rounded-lg overflow-hidden border border-gray-200">
      <div
        #mapContainer
        class="w-full"
        [style.height.px]="height()"
      ></div>

      <!-- Open in OSM overlay -->
      <a
        [href]="osmUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="absolute bottom-2 right-2 z-[1000] bg-white/95 hover:bg-white text-primary text-xs font-medium
               px-2 py-1 rounded-md shadow-sm border border-gray-200
               inline-flex items-center gap-1 transition-colors"
        title="Open in OpenStreetMap"
      >
        🗺️ Open in OSM ↗
      </a>
    </div>
  `,
})
export class LocationMapComponent implements AfterViewInit, OnDestroy {
  readonly lat = input.required<number>();
  readonly lng = input.required<number>();
  readonly height = input<number>(180);
  readonly zoom = input<number>(14);

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  readonly osmUrl = computed(() =>
    `https://www.openstreetmap.org/?mlat=${this.lat()}&mlon=${this.lng()}#map=${this.zoom()}/${this.lat()}/${this.lng()}`
  );

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  constructor() {
    afterNextRender(() => this.initMap());
  }

  ngAfterViewInit(): void {
    if (!this.map) this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }

  private initMap(): void {
    const el = this.mapContainer().nativeElement;
    const lat = this.lat();
    const lng = this.lng();

    this.map = L.map(el, {
      center: [lat, lng],
      zoom: this.zoom(),
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 0);
  }
}
