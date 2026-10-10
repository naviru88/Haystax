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

  // Optional popup content. If omitted, no popup is bound.
  readonly title = input<string | null>(null);
  readonly city = input<string | null>(null);
  readonly priceLabel = input<string | null>(null);

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

    this.marker = L.marker([lat, lng], { icon: this.buildIcon() }).addTo(this.map);

    const popupHtml = this.buildPopupHtml();
    if (popupHtml) {
      this.marker.bindPopup(popupHtml, {
        closeButton: false,
        offset: L.point(0, -8),
        className: 'haystax-popup',
      });
    }

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  // Custom primary-colored pin (inline SVG — no external image)
  private buildIcon(): L.DivIcon {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
            <feOffset dx="0" dy="1" result="off"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          filter="url(#shadow)"
          fill="var(--color-primary, #0d9488)"
          stroke="#ffffff"
          stroke-width="1.5"
          d="M16 1 C 8 1 2 7 2 15 C 2 25 16 41 16 41 C 16 41 30 25 30 15 C 30 7 24 1 16 1 Z"
        />
        <circle cx="16" cy="15" r="5" fill="#ffffff"/>
      </svg>
    `;

    return L.divIcon({
      html: svg,
      className: 'haystax-marker',
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -36],
    });
  }

  // Popup content (title + city + price)
  private buildPopupHtml(): string | null {
    const title = this.title();
    const city = this.city();
    const price = this.priceLabel();

    if (!title && !city && !price) return null;

    const escape = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
      );

    const parts: string[] = [];

    if (title) {
      parts.push(
        `<div style="font-weight:600;font-size:13px;color:#111827;margin-bottom:2px;">${escape(title)}</div>`
      );
    }
    if (city) {
      parts.push(
        `<div style="font-size:12px;color:#6b7280;">${escape(city)}</div>`
      );
    }
    if (price) {
      parts.push(
        `<div style="font-size:13px;font-weight:700;color:var(--color-primary, #0d9488);margin-top:4px;">${escape(price)}</div>`
      );
    }

    return `<div style="min-width:140px;max-width:220px;line-height:1.3;">${parts.join('')}</div>`;
  }
}
