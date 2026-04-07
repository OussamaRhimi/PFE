import { Component, Input, OnInit, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

// Tunisian cities coordinates
const TUNISIA_CITIES: Record<string, [number, number]> = {
  'tunis': [36.8065, 10.1815],
  'sfax': [34.7406, 10.7603],
  'sousse': [35.8288, 10.6405],
  'kairouan': [35.6781, 10.0963],
  'bizerte': [37.2744, 9.8739],
  'gabes': [33.8815, 10.0982],
  'ariana': [36.8663, 10.1647],
  'gafsa': [34.4250, 8.7842],
  'monastir': [35.7643, 10.8113],
  'ben arous': [36.7533, 10.2282],
  'kasserine': [35.1676, 8.8365],
  'medenine': [33.3549, 10.5055],
  'nabeul': [36.4561, 10.7376],
  'tataouine': [32.9297, 10.4518],
  'beja': [36.7256, 9.1817],
  'jendouba': [36.5011, 8.7802],
  'mahdia': [35.5047, 11.0622],
  'ksour essef': [35.4167, 10.9833],
  'sidi bouzid': [35.0382, 9.4849],
  'siliana': [36.0849, 9.3708],
  'kef': [36.1826, 8.7148],
  'tozeur': [33.9197, 8.1339],
  'kebili': [33.7044, 8.9690],
  'zaghouan': [36.4029, 10.1429],
  'manouba': [36.8101, 10.0863],
};

// International cities
const WORLD_CITIES: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522],
  'london': [51.5074, -0.1278],
  'new york': [40.7128, -74.0060],
  'berlin': [52.5200, 13.4050],
  'dubai': [25.2048, 55.2708],
  'tokyo': [35.6762, 139.6503],
  'singapore': [1.3521, 103.8198],
  'sydney': [-33.8688, 151.2093],
  'toronto': [43.6532, -79.3832],
  'amsterdam': [52.3676, 4.9041],
  'barcelona': [41.3851, 2.1734],
  'milan': [45.4642, 9.1900],
  'munich': [48.1351, 11.5820],
  'vienna': [48.2082, 16.3738],
  'zurich': [47.3769, 8.5417],
  'brussels': [50.8503, 4.3517],
  'stockholm': [59.3293, 18.0686],
  'oslo': [59.9139, 10.7522],
  'copenhagen': [55.6761, 12.5683],
  'helsinki': [60.1699, 24.9384],
  'dublin': [53.3498, -6.2603],
  'lisbon': [38.7223, -9.1393],
  'madrid': [40.4168, -3.7038],
  'rome': [41.9028, 12.4964],
  'athens': [37.9838, 23.7275],
  'cairo': [30.0444, 31.2357],
  'casablanca': [33.5731, -7.5898],
  'algiers': [36.7538, 3.0588],
  'rabat': [34.0209, -6.8416],
  'tripoli': [32.8872, 13.1913],
};

@Component({
  selector: 'app-location-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container" [style.height.px]="height" [class.loading]="isLoading" [class.error]="hasError">
      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <span class="loading-text">Locating...</span>
      </div>

      <!-- Error State -->
      <div class="error-overlay" *ngIf="hasError && !isLoading">
        <div class="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <span class="error-text">{{ location || 'Unknown location' }}</span>
        <span class="error-subtext">Map unavailable</span>
      </div>

      <!-- Map -->
      <div #mapElement class="map" [class.hidden]="isLoading || hasError"></div>

      <!-- Location Badge -->
      <div class="location-badge" *ngIf="!isLoading && !hasError">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{{ displayLocation }}</span>
      </div>

      <!-- Zoom Controls -->
      <div class="zoom-controls" *ngIf="!isLoading && !hasError">
        <button class="zoom-btn" (click)="zoomIn()" title="Zoom in">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="zoom-btn" (click)="zoomOut()" title="Zoom out">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      transition: all 0.3s ease;
    }

    .map-container:hover {
      box-shadow: 
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }

    .map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .map.hidden {
      opacity: 0;
    }

    /* Loading State */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 10;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }

    .loading-spinner {
      position: relative;
      width: 48px;
      height: 48px;
    }

    .spinner-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
      animation: spin 1.5s linear infinite;
    }

    .spinner-ring:nth-child(1) {
      border-top-color: #6366f1;
      animation-delay: 0s;
    }

    .spinner-ring:nth-child(2) {
      border-right-color: #8b5cf6;
      animation-delay: 0.2s;
      inset: 4px;
    }

    .spinner-ring:nth-child(3) {
      border-bottom-color: #a78bfa;
      animation-delay: 0.4s;
      inset: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      color: rgba(30, 41, 59, 0.7);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    /* Error State */
    .error-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      z-index: 10;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }

    .error-icon {
      color: rgba(71, 85, 105, 0.5);
      margin-bottom: 4px;
    }

    .error-text {
      color: rgba(30, 41, 59, 0.9);
      font-size: 14px;
      font-weight: 600;
    }

    .error-subtext {
      color: rgba(71, 85, 105, 0.6);
      font-size: 12px;
    }

    /* Location Badge */
    .location-badge {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border-radius: 20px;
      color: #1e293b;
      font-size: 13px;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .location-badge svg {
      color: #f43f5e;
    }

    /* Zoom Controls */
    .zoom-controls {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 1000;
    }

    .zoom-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      color: #1e293b;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .zoom-btn:hover {
      background: rgba(99, 102, 241, 0.9);
      color: white;
      transform: scale(1.05);
    }

    .zoom-btn:active {
      transform: scale(0.95);
    }

    /* Custom Leaflet Styles */
    :host ::ng-deep {
      .leaflet-container {
        background: #f1f5f9;
        font-family: inherit;
      }

      .leaflet-control-attribution {
        display: none;
      }

      .leaflet-control-zoom {
        display: none;
      }

      .custom-marker {
        position: relative;
      }

      .marker-pin {
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%);
        position: absolute;
        transform: rotate(-45deg);
        left: 50%;
        top: 50%;
        margin: -18px 0 0 -18px;
        box-shadow: 
          0 4px 12px rgba(244, 63, 94, 0.4),
          inset 0 -2px 4px rgba(0, 0, 0, 0.2);
        animation: bounce 0.5s ease-out;
      }

      .marker-pin::after {
        content: '';
        width: 18px;
        height: 18px;
        margin: 9px 0 0 9px;
        background: white;
        position: absolute;
        border-radius: 50%;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .marker-pulse {
        position: absolute;
        width: 48px;
        height: 48px;
        left: 50%;
        top: 50%;
        margin: -24px 0 0 -24px;
        border-radius: 50%;
        background: rgba(244, 63, 94, 0.3);
        animation: pulse 2s ease-out infinite;
      }

      @keyframes bounce {
        0% { transform: rotate(-45deg) translateY(-20px); opacity: 0; }
        60% { transform: rotate(-45deg) translateY(5px); }
        100% { transform: rotate(-45deg) translateY(0); opacity: 1; }
      }

      @keyframes pulse {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    }
  `]
})
export class LocationMapComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() location: string = '';
  @Input() height = 320;
  @ViewChild('mapElement') mapElement!: ElementRef;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  isLoading = true;
  hasError = false;
  displayLocation = '';

  ngOnInit(): void {
    this.displayLocation = this.formatLocation(this.location);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['location'] && !changes['location'].firstChange) {
      this.displayLocation = this.formatLocation(this.location);
      this.updateMapLocation();
    }
  }

  private formatLocation(loc: string): string {
    if (!loc || loc === '-') return 'Unknown';
    return loc.split(',').map(s => s.trim()).filter(Boolean).join(', ');
  }

  private findCoordinates(location: string): [number, number] | null {
    if (!location || location === '-') return null;

    const normalized = location.toLowerCase().trim();
    
    // Split into parts for more precise matching
    const locationParts = normalized.split(/[,\s]+/).map(p => p.trim()).filter(Boolean);
    
    // Check Tunisia cities - prioritize exact word matches
    for (const [city, coords] of Object.entries(TUNISIA_CITIES)) {
      // Check if any part of the location exactly matches the city
      if (locationParts.some(part => part === city || part === city.replace(' ', ''))) {
        return coords;
      }
    }
    
    // Check world cities - prioritize exact word matches  
    for (const [city, coords] of Object.entries(WORLD_CITIES)) {
      if (locationParts.some(part => part === city || part === city.replace(' ', ''))) {
        return coords;
      }
    }
    
    // Fallback: Check Tunisia cities with includes (but skip 'tunis' if other city found)
    let foundCity: [number, number] | null = null;
    for (const [city, coords] of Object.entries(TUNISIA_CITIES)) {
      if (city !== 'tunis' && normalized.includes(city)) {
        return coords; // Return immediately for non-tunis matches
      }
      if (city === 'tunis' && normalized.includes('tunis') && !normalized.includes('tunisia')) {
        foundCity = coords; // Only match 'tunis' if not part of 'tunisia'
      }
    }
    if (foundCity) return foundCity;

    // Check world cities with includes
    for (const [city, coords] of Object.entries(WORLD_CITIES)) {
      if (normalized.includes(city)) {
        return coords;
      }
    }

    // Default to Tunisia center if "tunisia" is mentioned
    if (normalized.includes('tunisia') || normalized.includes('tunisie')) {
      return [34.0, 9.0];
    }

    return null;
  }

  private initMap(): void {
    this.isLoading = true;
    this.hasError = false;

    const coords = this.findCoordinates(this.location);
    
    if (!coords) {
      this.isLoading = false;
      this.hasError = true;
      return;
    }

    try {
      // Fix Leaflet default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // Create map
      this.map = L.map(this.mapElement.nativeElement, {
        center: coords,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      // Use beautiful light/colorful tile layer (OpenStreetMap Mapnik - clean and readable)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(this.map);

      // Create custom marker
      const markerHtml = `
        <div class="custom-marker">
          <div class="marker-pulse"></div>
          <div class="marker-pin"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      this.marker = L.marker(coords, { icon: customIcon }).addTo(this.map);

      this.isLoading = false;
    } catch (error) {
      console.error('Map initialization error:', error);
      this.isLoading = false;
      this.hasError = true;
    }
  }

  private updateMapLocation(): void {
    const coords = this.findCoordinates(this.location);
    
    if (!coords) {
      this.hasError = true;
      return;
    }

    this.hasError = false;

    if (this.map && this.marker) {
      this.map.setView(coords, 12);
      this.marker.setLatLng(coords);
    } else {
      this.initMap();
    }
  }

  zoomIn(): void {
    if (this.map) {
      this.map.zoomIn();
    }
  }

  zoomOut(): void {
    if (this.map) {
      this.map.zoomOut();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
