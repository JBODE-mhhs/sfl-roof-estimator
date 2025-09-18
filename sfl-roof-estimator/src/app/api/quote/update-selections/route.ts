import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateQuoteSelectionsSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { WasteCalculationService } from '@/lib/calculations/waste';
import { PricingCalculationService } from '@/lib/calculations/pricing';
import { FinanceCalculationService } from '@/lib/calculations/finance';
import { calculateSlopedArea, getPitchTier } from '@/lib/calculations/pitch';

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 30, 15 * 60 * 1000); // 30 updates per 15 minutes

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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
    const { quoteId, sections, storyCount, tearOffLayers } = updateQuoteSelectionsSchema.parse(body);

    // Get existing quote and sections
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        sections: true,
        measurement: true
      }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Initialize calculation services
    const wasteService = new WasteCalculationService(prisma);
    const pricingService = new PricingCalculationService(prisma);
    const financeService = new FinanceCalculationService(prisma);

    // Update sections with new selections and recalculate
    const updatedSections = [];
    let totalPriceCents = 0;

    for (const sectionUpdate of sections) {
      const existingSection = quote.sections.find(s => s.id === sectionUpdate.sectionId);
      if (!existingSection) {
        continue;
      }

      // Calculate areas and waste
      let finalAreaSqFt = existingSection.planAreaSqFt;
      let pitchRisePer12 = existingSection.pitchRisePer12;

      if (existingSection.kind === 'SLOPED' && pitchRisePer12) {
        const pitchCalc = calculateSlopedArea(existingSection.planAreaSqFt, pitchRisePer12);
        finalAreaSqFt = pitchCalc.slopedAreaSqFt;
      }

      const wasteResult = await wasteService.calculateWaste(finalAreaSqFt, {
        facets: existingSection.complexityFacets,
        hipsValleys: existingSection.complexityHipsValleys,
        penetrations: existingSection.penetrations
      });

      // Calculate pricing
      const pricingInput = {
        systemType: sectionUpdate.systemType,
        county: quote.county,
        finalSquares: wasteResult.finalSquares,
        pitchTier: pitchRisePer12 ? getPitchTier(pitchRisePer12) : undefined,
        storyCount,
        tearOffLayers,
        isHVHZ: ['Miami-Dade', 'Broward'].includes(quote.county)
      };

      const pricingResult = await pricingService.calculateSectionPrice(pricingInput);

      // Update section
      const updatedSection = await prisma.roofSection.update({
        where: { id: sectionUpdate.sectionId },
        data: {
          selectedSystem: sectionUpdate.systemType,
          wastePercentApplied: wasteResult.totalWastePercent,
          finalAreaSqFt: wasteResult.finalAreaSqFt,
          finalSquares: wasteResult.finalSquares,
          priceCents: Math.round(pricingResult.totalPrice * 100)
        }
      });

      updatedSections.push(updatedSection);
      totalPriceCents += updatedSection.priceCents || 0;
    }

    // Calculate financing options
    const totalPrice = totalPriceCents / 100;
    const financingOptions = await financeService.calculateFinancingOptions(totalPrice);

    // Update quote totals
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        totalPrice: totalPriceCents,
        monthlyMin: Math.round(financingOptions.overallRange.monthlyMin * 100),
        monthlyMax: Math.round(financingOptions.overallRange.monthlyMax * 100)
      },
      include: {
        sections: true
      }
    });

    return NextResponse.json({
      quote: {
        id: updatedQuote.id,
        totalPrice: updatedQuote.totalPrice,
        totalPriceFormatted: `$${(totalPriceCents / 100).toLocaleString()}`,
        monthlyRange: {
          min: updatedQuote.monthlyMin ? updatedQuote.monthlyMin / 100 : 0,
          max: updatedQuote.monthlyMax ? updatedQuote.monthlyMax / 100 : 0,
          formatted: financeService.formatPaymentRange(
            financingOptions.overallRange.monthlyMin,
            financingOptions.overallRange.monthlyMax
          )
        },
        sections: updatedQuote.sections.map(section => ({
          id: section.id,
          kind: section.kind,
          selectedSystem: section.selectedSystem,
          finalSquares: section.finalSquares,
          price: section.priceCents ? section.priceCents / 100 : 0,
          priceFormatted: section.priceCents ? `$${(section.priceCents / 100).toLocaleString()}` : '$0'
        }))
      },
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
    console.error('Quote update error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}