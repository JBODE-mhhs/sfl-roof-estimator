import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Simple in-memory rate limiting for demo
// In production, use Redis or a proper rate limiting service
const requests = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  for (const [key, data] of requests.entries()) {
    if (data.reset < windowStart) {
      requests.delete(key);
    }
  }

  const current = requests.get(identifier);
  const reset = now + windowMs;

  if (!current || current.reset < now) {
    // First request or window expired
    requests.set(identifier, { count: 1, reset });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset
    };
  }

  current.count++;
  requests.set(identifier, current);

  const remaining = Math.max(0, limit - current.count);
  const success = current.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: current.reset
  };
}

export function getClientIdentifier(request: NextRequest): string {
  // In production, consider using a more sophisticated approach
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';

  // Could also include user agent or other factors
  return ip;
}