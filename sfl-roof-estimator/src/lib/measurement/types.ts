export interface MeasurementInput {
  lat: number;
  lng: number;
  placeId: string;
  address?: string;
}

export interface RoofComplexity {
  facets: number;
  hipsValleys: number;
  penetrations: number;
}

export interface RoofSectionData {
  kind: 'SLOPED' | 'FLAT';
  planAreaSqFt: number;
  pitchRisePer12?: number; // only if SLOPED
  complexity: RoofComplexity;
}

export interface MeasurementResult {
  quality: 'high' | 'medium' | 'low';
  method: 'thirdParty' | 'heuristic' | 'manual';
  sections: RoofSectionData[];
  imageryAttribution: string;
  metadata?: Record<string, any>;
}

export interface MeasurementAdapter {
  measure(input: MeasurementInput): Promise<MeasurementResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}

export interface GeocodeResult {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  county: string;
  components: {
    streetNumber?: string;
    route?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}