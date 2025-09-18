import { NextRequest, NextResponse } from 'next/server';
import { quotePricingSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

// Lazy load these to prevent build-time database connections
let PricingCalculationService: any;
let FinanceCalculationService: any;
let prisma: any;

async function getServices() {
  if (!PricingCalculationService) {
    const { PricingCalculationService: PCS } = await import('@/lib/calculations/pricing');
    const { FinanceCalculationService: FCS } = await import('@/lib/calculations/finance');
    const { prisma: p } = await import('@/lib/db');
    PricingCalculationService = PCS;
    FinanceCalculationService = FCS;
    prisma = p;
  }
  return { PricingCalculationService, FinanceCalculationService, prisma };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 25, 15 * 60 * 1000); // 25 pricing requests per 15 minutes

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many pricing requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { quoteId, sections } = quotePricingSchema.parse(body);

    const { PricingCalculationService: PCS, FinanceCalculationService: FCS, prisma: p } = await getServices();
    
    const pricingService = new PCS(p);
    const financeService = new FCS(p);

    // Calculate pricing for each section
    const sectionsWithIds = sections.map((section, index) => ({
      ...section,
      sectionId: `section-${index}`
    }));

    const pricingResult = await pricingService.calculateQuotePrice(sectionsWithIds);
    const totalPrice = pricingResult.totalPrice;

    // Calculate financing options
    const financingOptions = await financeService.calculateFinancingOptions(totalPrice);

    // If quoteId is provided, update the quote
    if (quoteId) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: {
          totalPrice: Math.round(totalPrice * 100),
          monthlyMin: Math.round(financingOptions.overallRange.monthlyMin * 100),
          monthlyMax: Math.round(financingOptions.overallRange.monthlyMax * 100)
        }
      });
    }

    return NextResponse.json({
      lineItems: pricingResult.breakdown.map((item: any) => ({
        description: item.description,
        amount: item.amount,
        amountFormatted: `$${item.amount.toLocaleString()}`,
        isMultiplier: item.isMultiplier
      })),
      totalCents: Math.round(totalPrice * 100),
      totalPriceFormatted: `$${totalPrice.toLocaleString()}`,
      monthlyRange: {
        minCents: Math.round(financingOptions.overallRange.monthlyMin * 100),
        maxCents: Math.round(financingOptions.overallRange.monthlyMax * 100),
        formatted: financeService.formatPaymentRange(
          financingOptions.overallRange.monthlyMin,
          financingOptions.overallRange.monthlyMax
        )
      },
      sections: pricingResult.sections.map((section: any) => ({
        sectionId: section.sectionId,
        totalPrice: section.totalPrice,
        totalPriceFormatted: `$${section.totalPrice.toLocaleString()}`,
        breakdown: section.breakdown.map((item: any) => ({
          description: item.description,
          amount: item.amount,
          amountFormatted: `$${item.amount.toLocaleString()}`,
          isMultiplier: item.isMultiplier
        }))
      })),
      financingOptions: financingOptions.options.map((option: any) => ({
        name: option.name,
        monthlyRange: financeService.formatPaymentRange(
          option.monthlyPaymentMin,
          option.monthlyPaymentMax
        ),
        aprRange: financeService.formatAPRRange(option.aprMin, option.aprMax),
        termRange: financeService.formatTermRange(option.termMinMonths, option.termMaxMonths)
      }))
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error) {
    console.error('Pricing calculation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}

// Add GET method to prevent build errors
export async function GET() {
  return NextResponse.json({ message: 'Quote pricing API' });
}