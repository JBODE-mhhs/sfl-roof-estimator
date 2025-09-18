import { PrismaClient, SystemType, PitchTier } from '@prisma/client';

export interface PricingInput {
  systemType: SystemType;
  county: string;
  finalSquares: number;
  pitchTier?: PitchTier;
  storyCount: number;
  tearOffLayers: number;
  isHVHZ: boolean;
}

export interface PricingResult {
  basePrice: number;
  pricePerSquare: number;
  totalSquarePrice: number;
  multipliers: Record<string, number>;
  fixedAdders: Record<string, number>;
  totalPrice: number;
  breakdown: PriceBreakdown[];
}

export interface PriceBreakdown {
  description: string;
  amount: number;
  isMultiplier: boolean;
}

export class PricingCalculationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async calculateSectionPrice(input: PricingInput): Promise<PricingResult> {
    // Get pricing matrix entry
    const pricingMatrix = await this.getPricingMatrix(input);

    if (!pricingMatrix) {
      throw new Error(`No pricing found for ${input.systemType} in ${input.county}`);
    }

    const basePrice = pricingMatrix.pricePerSquareCents / 100; // Convert to dollars
    const multipliers = pricingMatrix.multipliers as any || {};
    const fixedAdders = pricingMatrix.fixedAdders as any || {};

    // Calculate base square price
    let totalSquarePrice = basePrice * input.finalSquares;
    const breakdown: PriceBreakdown[] = [
      {
        description: `${input.systemType} - ${input.finalSquares.toFixed(1)} squares @ $${basePrice.toFixed(2)}/sq`,
        amount: totalSquarePrice,
        isMultiplier: false
      }
    ];

    // Apply multipliers
    let finalMultiplier = 1;

    // Pitch multiplier (for sloped only)
    if (input.pitchTier && multipliers.pitch?.[input.pitchTier]) {
      const pitchMultiplier = multipliers.pitch[input.pitchTier];
      finalMultiplier *= pitchMultiplier;
      breakdown.push({
        description: `${input.pitchTier} pitch adjustment`,
        amount: totalSquarePrice * (pitchMultiplier - 1),
        isMultiplier: true
      });
    }

    // Story multiplier
    if (input.storyCount > 1 && multipliers.story) {
      const storyMultiplier = Math.pow(multipliers.story, input.storyCount - 1);
      finalMultiplier *= storyMultiplier;
      breakdown.push({
        description: `${input.storyCount}-story adjustment`,
        amount: totalSquarePrice * (storyMultiplier - 1),
        isMultiplier: true
      });
    }

    // Tear-off multiplier
    if (input.tearOffLayers > 0 && multipliers.tearOff) {
      const tearOffMultiplier = 1 + (multipliers.tearOff * input.tearOffLayers);
      finalMultiplier *= tearOffMultiplier;
      breakdown.push({
        description: `${input.tearOffLayers} layer${input.tearOffLayers > 1 ? 's' : ''} tear-off`,
        amount: totalSquarePrice * (tearOffMultiplier - 1),
        isMultiplier: true
      });
    }

    // HVHZ multiplier
    if (input.isHVHZ && multipliers.hvhz) {
      finalMultiplier *= multipliers.hvhz;
      breakdown.push({
        description: 'High Velocity Hurricane Zone',
        amount: totalSquarePrice * (multipliers.hvhz - 1),
        isMultiplier: true
      });
    }

    // Apply all multipliers
    totalSquarePrice *= finalMultiplier;

    // Add fixed costs
    let fixedCosts = 0;
    for (const [key, value] of Object.entries(fixedAdders)) {
      const cost = (value as number) / 100; // Convert cents to dollars
      fixedCosts += cost;
      breakdown.push({
        description: this.formatAdderDescription(key),
        amount: cost,
        isMultiplier: false
      });
    }

    const totalPrice = totalSquarePrice + fixedCosts;

    return {
      basePrice,
      pricePerSquare: basePrice,
      totalSquarePrice,
      multipliers: this.convertMultipliersToNumbers(multipliers),
      fixedAdders: this.convertAddersToNumbers(fixedAdders),
      totalPrice,
      breakdown
    };
  }

  async calculateQuotePrice(sections: Array<PricingInput & { sectionId: string }>): Promise<{
    sections: Array<PricingResult & { sectionId: string }>;
    totalPrice: number;
    breakdown: PriceBreakdown[];
  }> {
    const sectionResults = await Promise.all(
      sections.map(async (section) => ({
        sectionId: section.sectionId,
        ...(await this.calculateSectionPrice(section))
      }))
    );

    const totalPrice = sectionResults.reduce((sum, section) => sum + section.totalPrice, 0);

    // Combine breakdowns
    const breakdown: PriceBreakdown[] = [];
    sectionResults.forEach((section, index) => {
      const sectionLabel = sections[index].systemType === 'SHINGLE' || sections[index].systemType === 'METAL'
        ? 'Sloped Sections'
        : 'Flat Sections';

      breakdown.push({
        description: `${sectionLabel} (${sections[index].systemType})`,
        amount: section.totalPrice,
        isMultiplier: false
      });
    });

    return {
      sections: sectionResults,
      totalPrice,
      breakdown
    };
  }

  private async getPricingMatrix(input: PricingInput) {
    // Try exact county match first
    let matrix = await this.prisma.pricingMatrix.findFirst({
      where: {
        county: input.county,
        systemType: input.systemType,
        pitchTier: input.pitchTier || null,
        storyTier: Math.min(input.storyCount, 3), // Cap at 3+
        tearOffLayers: input.tearOffLayers,
        hvhz: input.isHVHZ
      }
    });

    // Fallback to default county
    if (!matrix) {
      matrix = await this.prisma.pricingMatrix.findFirst({
        where: {
          county: 'DEFAULT',
          systemType: input.systemType,
          pitchTier: input.pitchTier || null,
          storyTier: Math.min(input.storyCount, 3),
          tearOffLayers: input.tearOffLayers,
          hvhz: input.isHVHZ
        }
      });
    }

    return matrix;
  }

  private convertMultipliersToNumbers(multipliers: any): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(multipliers || {})) {
      if (typeof value === 'object') {
        result[key] = this.convertMultipliersToNumbers(value);
      } else if (typeof value === 'number') {
        result[key] = value;
      }
    }
    return result;
  }

  private convertAddersToNumbers(adders: any): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(adders || {})) {
      if (typeof value === 'number') {
        result[key] = value / 100; // Convert cents to dollars
      }
    }
    return result;
  }

  private formatAdderDescription(key: string): string {
    const descriptions: Record<string, string> = {
      permit: 'Permit Fees',
      disposal: 'Material Disposal',
      dumpster: 'Dumpster Rental',
      cleanup: 'Job Site Cleanup',
      delivery: 'Material Delivery',
      mobilization: 'Mobilization'
    };
    return descriptions[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}