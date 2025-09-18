import { MeasurementAdapter, MeasurementInput, MeasurementResult, RoofSectionData } from '../types';

export interface ManualMeasurementData {
  sections: Array<{
    kind: 'SLOPED' | 'FLAT';
    planAreaSqFt: number;
    pitchRisePer12?: number;
    facets: number;
    hipsValleys: number;
    penetrations: number;
  }>;
  quality: 'high' | 'medium' | 'low';
  notes?: string;
}

export class ManualMeasurementAdapter implements MeasurementAdapter {
  private manualData: ManualMeasurementData | null = null;

  getName(): string {
    return 'manual';
  }

  async isAvailable(): Promise<boolean> {
    return this.manualData !== null;
  }

  setManualData(data: ManualMeasurementData): void {
    this.manualData = data;
  }

  async measure(input: MeasurementInput): Promise<MeasurementResult> {
    if (!this.manualData) {
      throw new Error('Manual measurement data not set');
    }

    const sections: RoofSectionData[] = this.manualData.sections.map(section => ({
      kind: section.kind,
      planAreaSqFt: section.planAreaSqFt,
      pitchRisePer12: section.pitchRisePer12,
      complexity: {
        facets: section.facets,
        hipsValleys: section.hipsValleys,
        penetrations: section.penetrations
      }
    }));

    return {
      quality: this.manualData.quality,
      method: 'manual',
      sections,
      imageryAttribution: '© Manual Override',
      metadata: {
        notes: this.manualData.notes,
        overrideTimestamp: new Date().toISOString()
      }
    };
  }
}