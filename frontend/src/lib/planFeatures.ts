'use client'

export type PlanTier = 'guest' | 'free' | 'trial' | 'premium'

export type FeatureFlag =
  | 'aiTools'
  | 'atsEnhancements'
  | 'collaboration'
  | 'jobAnalytics'
  | 'versionHistory'
  | 'shareLinks'
  | 'multiResume'
  | 'priorityExport'

interface PlanDefinition {
  label: string
  description: string
  features: Record<FeatureFlag, boolean>
}

export const planFeatures: Record<PlanTier, PlanDefinition> = {
  guest: {
    label: 'Guest',
    description: 'Basic editor access without sign-up.',
    features: {
      aiTools: false,
      atsEnhancements: false,
      collaboration: false,
      jobAnalytics: false,
      versionHistory: false,
      shareLinks: false,
      multiResume: false,
      priorityExport: false
    }
  },
  free: {
    label: 'Free',
    description: 'Core resume builder with limited AI features.',
    features: {
      aiTools: true,  // Limited (5/session)
      atsEnhancements: false,  // Basic only (1/day)
      collaboration: false,  // Not ready yet
      jobAnalytics: true,  // Free for one resume
      versionHistory: false,  // Limited (1 resume)
      shareLinks: true,
      multiResume: false,
      priorityExport: false
    }
  },
  trial: {
    label: 'Trial',
    description: '3-day free trial with full premium access.',
    features: {
      aiTools: true,
      atsEnhancements: true,
      collaboration: false,  // Not ready yet
      jobAnalytics: true,
      versionHistory: true,
      shareLinks: true,
      multiResume: true,
      priorityExport: true
    }
  },
  premium: {
    label: 'Premium',
    description: 'Full access to AI and analytics.',
    features: {
      aiTools: true,
      atsEnhancements: true,
      collaboration: false,  // Not ready yet
      jobAnalytics: true,
      versionHistory: true,
      shareLinks: true,
      multiResume: true,
      priorityExport: true
    }
  }
}

export const DEFAULT_PLAN: PlanTier = 'premium'

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  aiTools: 'AI writing tools',
  atsEnhancements: 'Enhanced ATS scoring',
  collaboration: 'Collaboration & comments',
  jobAnalytics: 'Job match analytics',
  versionHistory: 'Version history & comparisons',
  shareLinks: 'Shareable resume links',
  multiResume: 'Multiple resumes & layouts',
  priorityExport: 'Priority export formats'
}

export const isFeatureEnabledForPlan = (plan: PlanTier, feature: FeatureFlag): boolean => {
  // Check if premium mode is enabled
  const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
  
  // If premium mode is disabled, all features are enabled
  if (!premiumMode) {
    return true
  }
  
  return Boolean(planFeatures[plan]?.features?.[feature])
}

export const listEnabledFeatures = (plan: PlanTier): FeatureFlag[] => {
  return (Object.entries(planFeatures[plan]?.features ?? {}) as Array<[FeatureFlag, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature)
}

