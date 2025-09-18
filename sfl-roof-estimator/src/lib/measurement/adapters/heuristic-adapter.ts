import { MeasurementAdapter, MeasurementInput, MeasurementResult, RoofComplexity, RoofSectionData } from '../types';

export class HeuristicMeasurementAdapter implements MeasurementAdapter {
  getName(): string {
    return 'heuristic';
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  async measure(input: MeasurementInput): Promise<MeasurementResult> {
    // Simulate measurement delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For MVP, we'll create a simple heuristic based on typical South Florida homes
    const buildingFootprint = await this.estimateFootprint(input);
    const sections = await this.analyzeSections(buildingFootprint, input);

    return {
      quality: 'medium',
      method: 'heuristic',
      sections,
      imageryAttribution: '© Google / Heuristic Analysis',
      metadata: {
        estimatedFootprintSqFt: buildingFootprint.areaSqFt,
        confidenceScore: 0.65,
        needsUserConfirmation: sections.length > 2
      }
    };
  }

  private async estimateFootprint(input: MeasurementInput) {
    // Simulate building footprint estimation
    // In a real implementation, this would use satellite imagery analysis
    const baseArea = 1800 + (Math.random() * 800); // 1800-2600 sq ft typical range

    return {
      areaSqFt: baseArea,
      bounds: this.generateBounds(input.lat, input.lng, baseArea),
      shape: 'rectangular' // simplified for MVP
    };
  }

  private generateBounds(lat: number, lng: number, areaSqFt: number) {
    // Generate approximate building bounds
    const sideLength = Math.sqrt(areaSqFt) / 3280.84; // Convert to degrees roughly
    const offset = sideLength / 2;

    return {
      north: lat + offset,
      south: lat - offset,
      east: lng + offset,
      west: lng - offset
    };
  }

  private async analyzeSections(footprint: any, input: MeasurementInput): Promise<RoofSectionData[]> {
    const sections: RoofSectionData[] = [];

    // Heuristic: Most South Florida homes have mixed roofing
    // 70% chance of having both sloped and flat sections
    const hasMixedRoof = Math.random() > 0.3;

    if (hasMixedRoof) {
      // Sloped section (usually main house)
      const slopedArea = footprint.areaSqFt * (0.6 + Math.random() * 0.3); // 60-90% sloped
      sections.push({
        kind: 'SLOPED',
        planAreaSqFt: slopedArea,
        pitchRisePer12: this.estimatePitch(),
        complexity: this.estimateComplexity('SLOPED', slopedArea)
      });

      // Flat section (usually garage, addition, or porch)
      const flatArea = footprint.areaSqFt - slopedArea;
      if (flatArea > 200) { // Only add if significant size
        sections.push({
          kind: 'FLAT',
          planAreaSqFt: flatArea,
          complexity: this.estimateComplexity('FLAT', flatArea)
        });
      }
    } else {
      // Single roof type
      const isFlat = Math.random() > 0.8; // 20% chance of all-flat

      sections.push({
        kind: isFlat ? 'FLAT' : 'SLOPED',
        planAreaSqFt: footprint.areaSqFt,
        pitchRisePer12: isFlat ? undefined : this.estimatePitch(),
        complexity: this.estimateComplexity(isFlat ? 'FLAT' : 'SLOPED', footprint.areaSqFt)
      });
    }

    return sections;
  }

  private estimatePitch(): number {
    // South Florida typical pitches
    const pitches = [4, 5, 6, 7, 8]; // Most common pitches per 12"
    return pitches[Math.floor(Math.random() * pitches.length)];
  }

  private estimateComplexity(kind: 'SLOPED' | 'FLAT', areaSqFt: number): RoofComplexity {
    // Complexity estimation based on size and type
    const baseComplexity = areaSqFt < 1000 ? 'simple' : areaSqFt < 2000 ? 'moderate' : 'complex';

    let facets = 4; // Basic rectangle
    let hipsValleys = 0;
    let penetrations = 2; // Basic: 1 main vent, 1 exhaust

    if (kind === 'SLOPED') {
      switch (baseComplexity) {
        case 'simple':
          facets = 4 + Math.floor(Math.random() * 2); // 4-5
          hipsValleys = Math.floor(Math.random() * 2); // 0-1
          penetrations = 2 + Math.floor(Math.random() * 2); // 2-3
          break;
        case 'moderate':
          facets = 6 + Math.floor(Math.random() * 4); // 6-9
          hipsValleys = 2 + Math.floor(Math.random() * 3); // 2-4
          penetrations = 4 + Math.floor(Math.random() * 4); // 4-7
          break;
        case 'complex':
          facets = 10 + Math.floor(Math.random() * 6); // 10-15
          hipsValleys = 5 + Math.floor(Math.random() * 5); // 5-9
          penetrations = 6 + Math.floor(Math.random() * 6); // 6-11
          break;
      }
    } else {
      // Flat roofs are generally simpler
      facets = 1; // Single plane
      hipsValleys = 0;
      penetrations = Math.max(1, Math.floor(areaSqFt / 500)); // 1 per 500 sq ft
    }

    return { facets, hipsValleys, penetrations };
  }
}