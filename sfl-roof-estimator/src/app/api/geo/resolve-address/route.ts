import { NextRequest, NextResponse } from 'next/server';
import { addressSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

// Lazy load these to prevent build-time database connections
let MeasurementService: any;
let prisma: any;

async function getMeasurementService() {
  if (!MeasurementService) {
    const { MeasurementService: MS } = await import('@/lib/measurement/measurement-service');
    const { prisma: p } = await import('@/lib/db');
    MeasurementService = MS;
    prisma = p;
  }
  return { MeasurementService, prisma };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 20, 15 * 60 * 1000); // 20 requests per 15 minutes

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
    const { query } = addressSchema.parse(body);

    const { MeasurementService: MS, prisma: p } = await getMeasurementService();
    const measurementService = new MS(p);
    const result = await measurementService.resolveAddress(query);

    // Get Street View thumbnail if available
    const streetViewUrl = await measurementService.getStreetViewThumbnail(
      result.lat,
      result.lng
    );

    return NextResponse.json({
      ...result,
      streetViewUrl
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error) {
    console.error('Address resolution error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resolve address' },
      { status: 500 }
    );
  }
}

// Add GET method to prevent build errors
export async function GET() {
  return NextResponse.json({ message: 'Address resolution API' });
}