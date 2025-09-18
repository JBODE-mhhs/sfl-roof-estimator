import { NextRequest, NextResponse } from 'next/server';
import { MeasurementService } from '@/lib/measurement/measurement-service';
import { prisma } from '@/lib/db';
import { measurementSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter for measurement requests)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 10, 15 * 60 * 1000); // 10 requests per 15 minutes

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many measurement requests. Please try again later.' },
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
    const input = measurementSchema.parse(body);

    const measurementService = new MeasurementService(prisma);
    const result = await measurementService.getRoofMeasurements(input);

    // Remove waste percentage information from client response
    const sanitizedMeasurement = {
      ...result.measurement,
      sections: result.measurement.sections.map(section => ({
        kind: section.kind,
        planAreaSqFt: section.planAreaSqFt,
        pitchRisePer12: section.pitchRisePer12,
        complexity: section.complexity,
        // Note: We don't send waste calculations to the client
      })),
      measurementId: result.measurementId
    };

    return NextResponse.json(sanitizedMeasurement, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error) {
    console.error('Measurement error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Measurement service temporarily unavailable' },
      { status: 503 }
    );
  }
}