import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { quotePricingSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { PricingCalculationService } from '@/lib/calculations/pricing';
import { FinanceCalculationService } from '@/lib/calculations/finance';

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

    const pricingService = new PricingCalculationService(prisma);
    const financeService = new FinanceCalculationService(prisma);

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
      lineItems: pricingResult.breakdown.map(item => ({
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
      sections: pricingResult.sections.map(section => ({
        sectionId: section.sectionId,
        totalPrice: section.totalPrice,
        totalPriceFormatted: `$${section.totalPrice.toLocaleString()}`,
        breakdown: section.breakdown.map(item => ({
          description: item.description,
          amount: item.amount,
          amountFormatted: `$${item.amount.toLocaleString()}`,
          isMultiplier: item.isMultiplier
        }))
      })),
      financingOptions: financingOptions.options.map(option => ({
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