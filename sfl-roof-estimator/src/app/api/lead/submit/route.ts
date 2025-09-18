import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { leadSubmissionSchema } from '@/lib/validation';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 5, 15 * 60 * 1000); // 5 lead submissions per 15 minutes

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many lead submissions. Please try again later.' },
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
    const { quoteId, name, email, phone } = leadSubmissionSchema.parse(body);

    // Verify quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Update quote with customer information
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        status: 'SENT' // Mark quote as sent
      }
    });

    // Create lead record
    const lead = await prisma.lead.create({
      data: {
        quoteId,
        name,
        email,
        phone,
        status: 'NEW'
      }
    });

    // TODO: In production, trigger email notifications here
    // TODO: Integrate with CRM system
    // TODO: Send confirmation email to customer

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Thank you! We will contact you soon to schedule your free inspection.'
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });
  } catch (error) {
    console.error('Lead submission error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit lead' },
      { status: 500 }
    );
  }
}