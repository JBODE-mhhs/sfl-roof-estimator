import { MeasurementAdapter, MeasurementInput, MeasurementResult } from '../types';

export class ThirdPartyMeasurementAdapter implements MeasurementAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.THIRD_PARTY_MEASUREMENT_API_KEY || '';
    this.baseUrl = baseUrl || process.env.THIRD_PARTY_MEASUREMENT_BASE_URL || '';
  }

  getName(): string {
    return 'thirdParty';
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || !this.baseUrl) {
      return false;
    }

    try {
      // Check if the third-party service is available
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async measure(input: MeasurementInput): Promise<MeasurementResult> {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error('Third-party measurement service not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/measure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          latitude: input.lat,
          longitude: input.lng,
          placeId: input.placeId,
          address: input.address,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Third-party service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform third-party response to our format
      return this.transformResponse(data);
    } catch (error) {
      console.error('Third-party measurement failed:', error);
      throw new Error('Third-party measurement service unavailable');
    }
  }

  private transformResponse(data: any): MeasurementResult {
    // This would transform the third-party API response to our standard format
    // The exact transformation depends on the third-party API structure

    // Example transformation (adjust based on actual API):
    const sections = data.roofSections?.map((section: any) => ({
      kind: section.type === 'pitched' ? 'SLOPED' : 'FLAT',
      planAreaSqFt: section.planArea,
      pitchRisePer12: section.pitch,
      complexity: {
        facets: section.facetCount || 4,
        hipsValleys: section.hipsAndValleys || 0,
        penetrations: section.penetrations || 2
      }
    })) || [];

    return {
      quality: data.confidence > 0.8 ? 'high' : data.confidence > 0.6 ? 'medium' : 'low',
      method: 'thirdParty',
      sections,
      imageryAttribution: data.attribution || '© Third Party Measurement Service',
      metadata: {
        confidence: data.confidence,
        processingTime: data.processingTimeMs,
        vendorId: data.vendorId,
        measurementId: data.measurementId
      }
    };
  }
}