'use client'

export type PlanTier = 'free' | 'premium'

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
  free: {
    label: 'Free',
    description: 'Core resume builder essentials.',
    features: {
      aiTools: false,
      atsEnhancements: false,
      collaboration: false,
      jobAnalytics: false,
      versionHistory: false,
      shareLinks: true,
      multiResume: false,
      priorityExport: false
    }
  },
  premium: {
    label: 'Premium',
    description: 'Full access to AI, collaboration, and analytics.',
    features: {
      aiTools: true,
      atsEnhancements: true,
      collaboration: true,
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
  return Boolean(planFeatures[plan]?.features?.[feature])
}

export const listEnabledFeatures = (plan: PlanTier): FeatureFlag[] => {
  return (Object.entries(planFeatures[plan]?.features ?? {}) as Array<[FeatureFlag, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature)
}

