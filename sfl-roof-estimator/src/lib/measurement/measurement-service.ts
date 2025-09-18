import { PrismaClient } from '@prisma/client';
import { MeasurementAdapter, MeasurementInput, MeasurementResult, GeocodeResult } from './types';
import { HeuristicMeasurementAdapter } from './adapters/heuristic-adapter';
import { ManualMeasurementAdapter } from './adapters/manual-adapter';
import { ThirdPartyMeasurementAdapter } from './adapters/third-party-adapter';

export class MeasurementService {
  private adapters: MeasurementAdapter[] = [];
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    // Initialize adapters in order of preference
    this.adapters = [
      new ThirdPartyMeasurementAdapter(),
      new ManualMeasurementAdapter(),
      new HeuristicMeasurementAdapter(), // Always last as fallback
    ];
  }

  async getRoofMeasurements(input: MeasurementInput): Promise<{
    measurement: MeasurementResult;
    measurementId: string;
  }> {
    let selectedAdapter: MeasurementAdapter | null = null;
    let lastError: Error | null = null;

    // Try adapters in order of preference
    for (const adapter of this.adapters) {
      try {
        const isAvailable = await adapter.isAvailable();
        if (isAvailable) {
          selectedAdapter = adapter;
          break;
        }
      } catch (error) {
        console.warn(`Adapter ${adapter.getName()} check failed:`, error);
        lastError = error as Error;
      }
    }

    if (!selectedAdapter) {
      throw new Error(`No measurement adapters available. Last error: ${lastError?.message}`);
    }

    console.log(`Using measurement adapter: ${selectedAdapter.getName()}`);

    try {
      const measurementResult = await selectedAdapter.measure(input);

      // Store the measurement in database
      const measurementRecord = await this.prisma.measurement.create({
        data: {
          method: measurementResult.method,
          quality: measurementResult.quality,
          rawJson: measurementResult as any,
        },
      });

      return {
        measurement: measurementResult,
        measurementId: measurementRecord.id,
      };
    } catch (error) {
      console.error(`Measurement failed with ${selectedAdapter.getName()}:`, error);
      throw new Error(`Measurement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resolveAddress(query: string): Promise<GeocodeResult> {
    const apiKey = process.env.GOOGLE_GEOCODE_API_KEY;
    if (!apiKey) {
      throw new Error('Google Geocoding API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&components=administrative_area:FL|country:US`
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`No results found for address: ${query}`);
      }

      const result = data.results[0];
      const components = result.address_components;

      // Extract county information
      const countyComponent = components.find((comp: any) =>
        comp.types.includes('administrative_area_level_2')
      );

      const county = countyComponent?.long_name?.replace(' County', '') || 'Unknown';

      // Validate it's in South Florida
      const validCounties = ['Miami-Dade', 'Broward', 'Palm Beach'];
      if (!validCounties.includes(county)) {
        throw new Error(`Service area limited to ${validCounties.join(', ')} counties`);
      }

      return {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        county,
        components: {
          streetNumber: components.find((c: any) => c.types.includes('street_number'))?.long_name,
          route: components.find((c: any) => c.types.includes('route'))?.long_name,
          city: components.find((c: any) => c.types.includes('locality'))?.long_name,
          state: components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name,
          zipCode: components.find((c: any) => c.types.includes('postal_code'))?.long_name,
          country: components.find((c: any) => c.types.includes('country'))?.short_name,
        },
      };
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw error instanceof Error ? error : new Error('Address resolution failed');
    }
  }

  async getStreetViewThumbnail(lat: number, lng: number): Promise<string | null> {
    const apiKey = process.env.GOOGLE_GEOCODE_API_KEY;
    if (!apiKey) {
      return null;
    }

    // Check if Street View imagery is available
    try {
      const metadataResponse = await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`
      );

      const metadata = await metadataResponse.json();

      if (metadata.status === 'OK') {
        return `https://maps.googleapis.com/maps/api/streetview?location=${lat},${lng}&size=400x300&fov=60&heading=0&pitch=0&key=${apiKey}`;
      }
    } catch (error) {
      console.warn('Street View check failed:', error);
    }

    return null;
  }
}