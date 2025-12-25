'use client'

export type PlanTier = 'guest' | 'free' | 'trial' | 'premium'

export type FeatureType = 
  | 'improvement'
  | 'ats'
  | 'ats_enhanced'
  | 'cover_letter'
  | 'content_generation'
  | 'section_assistant'
  | 'job_matching'
  | 'exports'

export interface UsageLimit {
  monthly?: number | null
  daily?: number | null
  session?: number | null
}

export interface PlanLimits {
  exports: UsageLimit
  ai_improvements: UsageLimit
  ats_scores: UsageLimit
  cover_letters: UsageLimit
}

export const USAGE_LIMITS: Record<PlanTier, PlanLimits> = {
  guest: {
    exports: { monthly: 1 },
    ai_improvements: { session: 3 },
    ats_scores: { daily: null },
    cover_letters: { monthly: 0 },
  },
  free: {
    exports: { monthly: 3 },
    ai_improvements: { session: 5 },
    ats_scores: { daily: null },
    cover_letters: { monthly: 1 },
  },
  trial: {
    exports: { monthly: null },
    ai_improvements: { session: null },
    ats_scores: { daily: null },
    cover_letters: { monthly: null },
  },
  premium: {
    exports: { monthly: null },
    ai_improvements: { session: null },
    ats_scores: { daily: null },
    cover_letters: { monthly: null },
  },
}

export function getUsageLimits(planTier: PlanTier): PlanLimits {
  return USAGE_LIMITS[planTier] || USAGE_LIMITS.free
}

export function isUnlimited(limit: UsageLimit): boolean {
  return limit.monthly === null || limit.daily === null || limit.session === null
}

export function checkFeatureLimit(
  featureType: FeatureType,
  planTier: PlanTier,
  currentUsage: number,
  period: 'monthly' | 'daily' | 'session'
): { allowed: boolean; limit: number | null; remaining: number | null } {
  // ATS scoring is always free and unlimited
  if (featureType === 'ats' || featureType === 'ats_enhanced') {
    return { allowed: true, limit: null, remaining: null }
  }
  
  const limits = getUsageLimits(planTier)
  
  let limitKey: keyof PlanLimits
  switch (featureType) {
    case 'improvement':
    case 'content_generation':
    case 'section_assistant':
    case 'job_matching':
      limitKey = 'ai_improvements'
      break
    case 'cover_letter':
      limitKey = 'cover_letters'
      break
    case 'exports':
      limitKey = 'exports'
      break
    default:
      limitKey = 'ai_improvements'
  }
  
  const featureLimit = limits[limitKey]
  const limitValue = period === 'monthly' 
    ? featureLimit.monthly 
    : period === 'daily' 
    ? featureLimit.daily 
    : featureLimit.session
  
  if (limitValue === null || limitValue === undefined || typeof limitValue !== 'number') {
    return { allowed: true, limit: null, remaining: null }
  }
  
  const limit: number = limitValue
  const allowed = currentUsage < limit
  const remaining = limit - currentUsage
  
  return { allowed, limit, remaining: Math.max(0, remaining) }
}

export function getFeatureLimitKey(featureType: FeatureType): keyof PlanLimits {
  switch (featureType) {
    case 'improvement':
    case 'content_generation':
    case 'section_assistant':
    case 'job_matching':
      return 'ai_improvements'
    case 'ats':
    case 'ats_enhanced':
      return 'ats_scores'
    case 'cover_letter':
      return 'cover_letters'
    case 'exports':
      return 'exports'
    default:
      return 'ai_improvements'
  }
}

export function isPremiumModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
}

