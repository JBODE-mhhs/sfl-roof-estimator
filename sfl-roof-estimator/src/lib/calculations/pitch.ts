export type PitchTier = 'LOW' | 'MEDIUM' | 'STEEP';

export interface PitchCalculation {
  risePer12: number;
  tier: PitchTier;
  multiplier: number;
  slopedAreaSqFt: number;
  description: string;
}

export function calculatePitchMultiplier(pitchRisePer12: number): number {
  // Calculate the multiplier for sloped surface area
  // Formula: multiplier = sqrt(1 + (rise/12)^2)
  const riseRatio = pitchRisePer12 / 12;
  return Math.sqrt(1 + (riseRatio * riseRatio));
}

export function getPitchTier(pitchRisePer12: number): PitchTier {
  if (pitchRisePer12 <= 4) return 'LOW';
  if (pitchRisePer12 <= 7) return 'MEDIUM';
  return 'STEEP';
}

export function calculateSlopedArea(planAreaSqFt: number, pitchRisePer12: number): PitchCalculation {
  const multiplier = calculatePitchMultiplier(pitchRisePer12);
  const tier = getPitchTier(pitchRisePer12);
  const slopedAreaSqFt = planAreaSqFt * multiplier;

  let description: string;
  switch (tier) {
    case 'LOW':
      description = 'Low pitch (2/12 - 4/12)';
      break;
    case 'MEDIUM':
      description = 'Medium pitch (5/12 - 7/12)';
      break;
    case 'STEEP':
      description = 'Steep pitch (8/12 - 12/12)';
      break;
  }

  return {
    risePer12: pitchRisePer12,
    tier,
    multiplier,
    slopedAreaSqFt,
    description
  };
}

export function estimatePitchFromVisual(visualEstimate: 'low' | 'medium' | 'steep'): number {
  // Convert visual estimate to specific pitch value
  switch (visualEstimate) {
    case 'low': return 3; // 3/12
    case 'medium': return 6; // 6/12
    case 'steep': return 9; // 9/12
  }
}