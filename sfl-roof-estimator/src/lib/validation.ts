import { z } from 'zod';

// Address validation
export const addressSchema = z.object({
  query: z.string().min(1, 'Address is required').max(500, 'Address too long')
});

// Quote creation
export const createQuoteSchema = z.object({
  address: z.string().min(1),
  placeId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  county: z.string().min(1)
});

// Measurement request
export const measurementSchema = z.object({
  placeId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional()
});

// Section selection
export const sectionSelectionSchema = z.object({
  sectionId: z.string().cuid(),
  systemType: z.enum(['SHINGLE', 'METAL', 'FLAT_TPO', 'FLAT_MODBIT', 'FLAT_BUR']),
  pitchTier: z.enum(['LOW', 'MEDIUM', 'STEEP']).optional()
});

// Quote update
export const updateQuoteSelectionsSchema = z.object({
  quoteId: z.string().cuid(),
  sections: z.array(sectionSelectionSchema).min(1),
  storyCount: z.number().int().min(1).max(3).default(1),
  tearOffLayers: z.number().int().min(0).max(2).default(0)
});

// Lead submission
export const leadSubmissionSchema = z.object({
  quoteId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)\.]{10,}$/, 'Invalid phone number').optional()
}).refine(data => data.name || data.email || data.phone, {
  message: 'At least one contact method (name, email, or phone) is required'
});

// Quote pricing
export const quotePricingSchema = z.object({
  quoteId: z.string().cuid().optional(),
  sections: z.array(z.object({
    systemType: z.enum(['SHINGLE', 'METAL', 'FLAT_TPO', 'FLAT_MODBIT', 'FLAT_BUR']),
    finalSquares: z.number().positive(),
    pitchTier: z.enum(['LOW', 'MEDIUM', 'STEEP']).optional(),
    county: z.string().min(1),
    storyCount: z.number().int().min(1).max(3),
    tearOffLayers: z.number().int().min(0).max(2),
    isHVHZ: z.boolean()
  })).min(1)
});

// Manual measurement override (admin only)
export const manualMeasurementSchema = z.object({
  sections: z.array(z.object({
    kind: z.enum(['SLOPED', 'FLAT']),
    planAreaSqFt: z.number().positive().max(10000),
    pitchRisePer12: z.number().min(1).max(20).optional(),
    facets: z.number().int().min(1).max(50),
    hipsValleys: z.number().int().min(0).max(20),
    penetrations: z.number().int().min(0).max(50)
  })).min(1),
  quality: z.enum(['high', 'medium', 'low']),
  notes: z.string().max(1000).optional()
});

// Rate limiting
export const rateLimitHeaders = {
  remaining: 'X-RateLimit-Remaining',
  reset: 'X-RateLimit-Reset',
  limit: 'X-RateLimit-Limit'
};

// Common response schemas
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional()
});

export const successResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional()
});