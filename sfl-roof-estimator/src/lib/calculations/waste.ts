import { PrismaClient } from '@prisma/client';

export interface WasteCalculationInput {
  facets: number;
  hipsValleys: number;
  penetrations: number;
  basePercent?: number;
  maxPercent?: number;
}

export interface WasteCalculationResult {
  baseWaste: number;
  facetsAdder: number;
  hipsValleysAdder: number;
  penetrationsAdder: number;
  totalWastePercent: number;
  finalAreaSqFt: number;
  finalSquares: number;
}

export interface WasteRule {
  min: number;
  max: number;
  add: number;
}

export interface WasteRulesConfig {
  basePercent: number;
  maxPercent: number;
  facets: WasteRule[];
  hipsValleys: WasteRule[];
  penetrations: WasteRule[];
}

const DEFAULT_WASTE_RULES: WasteRulesConfig = {
  basePercent: 12,
  maxPercent: 22,
  facets: [
    { min: 0, max: 6, add: 0 },
    { min: 7, max: 12, add: 2 },
    { min: 13, max: 20, add: 4 },
    { min: 21, max: 999, add: 6 }
  ],
  hipsValleys: [
    { min: 0, max: 2, add: 0 },
    { min: 3, max: 5, add: 1 },
    { min: 6, max: 10, add: 3 },
    { min: 11, max: 999, add: 5 }
  ],
  penetrations: [
    { min: 0, max: 3, add: 0 },
    { min: 4, max: 8, add: 1 },
    { min: 9, max: 15, add: 2 },
    { min: 16, max: 999, add: 4 }
  ]
};

export class WasteCalculationService {
  private prisma: PrismaClient;
  private cachedRules: WasteRulesConfig | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getWasteRules(): Promise<WasteRulesConfig> {
    if (this.cachedRules) {
      return this.cachedRules;
    }

    try {
      const wasteRules = await this.prisma.wasteRules.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (wasteRules) {
        this.cachedRules = {
          basePercent: wasteRules.basePercent,
          maxPercent: wasteRules.maxPercent,
          ...(wasteRules.addersJson as any)
        };
      } else {
        this.cachedRules = DEFAULT_WASTE_RULES;
      }

      return this.cachedRules;
    } catch (error) {
      console.warn('Failed to load waste rules from database, using defaults:', error);
      return DEFAULT_WASTE_RULES;
    }
  }

  invalidateCache(): void {
    this.cachedRules = null;
  }

  private getAdderForValue(value: number, rules: WasteRule[]): number {
    const rule = rules.find(r => value >= r.min && value <= r.max);
    return rule?.add || 0;
  }

  async calculateWaste(
    areaSqFt: number,
    complexity: WasteCalculationInput
  ): Promise<WasteCalculationResult> {
    const rules = await this.getWasteRules();

    const baseWaste = rules.basePercent;
    const facetsAdder = this.getAdderForValue(complexity.facets, rules.facets);
    const hipsValleysAdder = this.getAdderForValue(complexity.hipsValleys, rules.hipsValleys);
    const penetrationsAdder = this.getAdderForValue(complexity.penetrations, rules.penetrations);

    // Calculate total waste percentage
    let totalWastePercent = baseWaste + facetsAdder + hipsValleysAdder + penetrationsAdder;

    // Apply maximum cap
    totalWastePercent = Math.min(totalWastePercent, rules.maxPercent);

    // Calculate final areas
    const finalAreaSqFt = areaSqFt * (1 + totalWastePercent / 100);
    const finalSquares = finalAreaSqFt / 100; // Convert to roofing squares

    return {
      baseWaste,
      facetsAdder,
      hipsValleysAdder,
      penetrationsAdder,
      totalWastePercent,
      finalAreaSqFt,
      finalSquares
    };
  }

  async calculateWasteForSections(sections: Array<{
    areaSqFt: number;
    facets: number;
    hipsValleys: number;
    penetrations: number;
  }>): Promise<WasteCalculationResult[]> {
    return Promise.all(
      sections.map(section =>
        this.calculateWaste(section.areaSqFt, {
          facets: section.facets,
          hipsValleys: section.hipsValleys,
          penetrations: section.penetrations
        })
      )
    );
  }
}