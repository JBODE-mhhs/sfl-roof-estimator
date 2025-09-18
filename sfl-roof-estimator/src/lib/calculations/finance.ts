import { PrismaClient } from '@prisma/client';

export interface FinancingOption {
  id: string;
  name: string;
  aprMin: number;
  aprMax: number;
  termMinMonths: number;
  termMaxMonths: number;
  dealerFeePercent?: number;
  amountMinCents?: number;
  amountMaxCents?: number;
}

export interface FinancingCalculation {
  monthlyPaymentMin: number;
  monthlyPaymentMax: number;
  totalInterestMin: number;
  totalInterestMax: number;
  totalPaymentMin: number;
  totalPaymentMax: number;
}

export interface FinancingResult {
  options: Array<FinancingOption & FinancingCalculation>;
  overallRange: {
    monthlyMin: number;
    monthlyMax: number;
  };
}

export class FinanceCalculationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async calculateFinancingOptions(loanAmount: number): Promise<FinancingResult> {
    // Get active financing plans
    const plans = await this.prisma.financePlan.findMany({
      where: {
        active: true,
        OR: [
          { amountMinCents: null },
          { amountMinCents: { lte: loanAmount * 100 } }
        ]
      }
    });

    if (plans.length === 0) {
      throw new Error('No financing options available');
    }

    const options = plans
      .filter(plan => {
        // Check if loan amount is within plan limits
        const minAmount = plan.amountMinCents ? plan.amountMinCents / 100 : 0;
        const maxAmount = plan.amountMaxCents ? plan.amountMaxCents / 100 : Infinity;
        return loanAmount >= minAmount && loanAmount <= maxAmount;
      })
      .map(plan => {
        const calculation = this.calculatePaymentRange(
          loanAmount,
          plan.aprMin / 100,
          plan.aprMax / 100,
          plan.termMinMonths,
          plan.termMaxMonths,
          plan.dealerFeePercent ? plan.dealerFeePercent / 100 : 0
        );

        return {
          id: plan.id,
          name: plan.name,
          aprMin: plan.aprMin,
          aprMax: plan.aprMax,
          termMinMonths: plan.termMinMonths,
          termMaxMonths: plan.termMaxMonths,
          dealerFeePercent: plan.dealerFeePercent ?? undefined,
          amountMinCents: plan.amountMinCents ?? undefined,
          amountMaxCents: plan.amountMaxCents ?? undefined,
          ...calculation
        };
      });

    // Calculate overall range across all plans
    const overallRange = {
      monthlyMin: Math.min(...options.map(opt => opt.monthlyPaymentMin)),
      monthlyMax: Math.max(...options.map(opt => opt.monthlyPaymentMax))
    };

    return {
      options,
      overallRange
    };
  }

  private calculatePaymentRange(
    principal: number,
    aprMin: number,
    aprMax: number,
    termMinMonths: number,
    termMaxMonths: number,
    dealerFeePercent: number = 0
  ): FinancingCalculation {
    // Add dealer fee to principal if applicable
    const adjustedPrincipal = principal * (1 + dealerFeePercent);

    // Calculate minimum payment (lowest APR, longest term)
    const monthlyMin = this.calculateMonthlyPayment(
      adjustedPrincipal,
      aprMin,
      termMaxMonths
    );

    // Calculate maximum payment (highest APR, shortest term)
    const monthlyMax = this.calculateMonthlyPayment(
      adjustedPrincipal,
      aprMax,
      termMinMonths
    );

    // Calculate total interest and payments
    const totalPaymentMin = monthlyMin * termMaxMonths;
    const totalPaymentMax = monthlyMax * termMinMonths;
    const totalInterestMin = totalPaymentMin - adjustedPrincipal;
    const totalInterestMax = totalPaymentMax - adjustedPrincipal;

    return {
      monthlyPaymentMin: monthlyMin,
      monthlyPaymentMax: monthlyMax,
      totalInterestMin,
      totalInterestMax,
      totalPaymentMin,
      totalPaymentMax
    };
  }

  private calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    termMonths: number
  ): number {
    if (annualRate === 0) {
      return principal / termMonths;
    }

    const monthlyRate = annualRate / 12;
    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    return Math.round(monthlyPayment * 100) / 100; // Round to nearest cent
  }

  async getFinancingDisclaimer(): Promise<string> {
    const settings = await this.prisma.appSettings.findFirst();

    const defaultDisclaimer =
      "Monthly payment estimates shown are for illustration purposes only and subject to credit approval. " +
      "Actual terms, rates, and payments may vary based on creditworthiness and loan program selected. " +
      "Contact us for personalized financing options.";

    return settings?.disclaimerText || defaultDisclaimer;
  }

  formatPaymentRange(monthlyMin: number, monthlyMax: number): string {
    if (Math.abs(monthlyMin - monthlyMax) < 1) {
      return `$${monthlyMin.toFixed(0)}/month`;
    }
    return `$${monthlyMin.toFixed(0)} - $${monthlyMax.toFixed(0)}/month`;
  }

  formatAPRRange(aprMin: number, aprMax: number): string {
    if (aprMin === aprMax) {
      return `${aprMin.toFixed(2)}% APR`;
    }
    return `${aprMin.toFixed(2)}% - ${aprMax.toFixed(2)}% APR`;
  }

  formatTermRange(termMinMonths: number, termMaxMonths: number): string {
    const minYears = Math.floor(termMinMonths / 12);
    const maxYears = Math.floor(termMaxMonths / 12);

    if (minYears === maxYears) {
      return `${minYears} year${minYears !== 1 ? 's' : ''}`;
    }
    return `${minYears}-${maxYears} years`;
  }
}