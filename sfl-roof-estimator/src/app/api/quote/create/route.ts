import { NextRequest, NextResponse } from 'next/server';
import { createQuoteSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

// Lazy load prisma to prevent build-time database connections
async function getPrisma() {
  const { prisma } = await import('@/lib/db');
  return prisma;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 15, 15 * 60 * 1000); // 15 quotes per 15 minutes

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many quote requests. Please try again later.' },
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
    const data = createQuoteSchema.parse(body);

    const prisma = await getPrisma();
    
    // Create the quote
    const quote = await prisma.quote.create({
      data: {
        address: data.address,
        placeId: data.placeId,
        lat: data.lat,
        lng: data.lng,
        county: data.county,
        status: 'DRAFT'
      }
    });

    return NextResponse.json({
      quoteId: quote.id,
      status: quote.status,
      address: quote.address,
      county: quote.county
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error) {
    console.error('Quote creation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}

// Add GET method to prevent build errors
export async function GET() {
  return NextResponse.json({ message: 'Quote creation API' });
}