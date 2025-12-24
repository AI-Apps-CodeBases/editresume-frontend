import { z } from 'zod'

export const resumeBulletSchema = z.object({
  id: z.string(),
  text: z.string(),
  params: z.record(z.unknown()).optional(),
})

export const resumeSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  bullets: z.array(resumeBulletSchema),
  params: z.record(z.unknown()).optional(),
})

export const resumeDataSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  sections: z.array(resumeSectionSchema),
  fieldsVisible: z.record(z.boolean()).optional(),
})

export type ResumeData = z.infer<typeof resumeDataSchema>
export type ResumeSection = z.infer<typeof resumeSectionSchema>
export type ResumeBullet = z.infer<typeof resumeBulletSchema>

export type TailorOptions = {
  tone?: 'professional' | 'concise' | 'friendly'
  maxNewBullets?: number
  allowNewBullets?: boolean
}

const updateTitleOpSchema = z.object({
  op: z.literal('update_title'),
  next: z.string(),
  prev: z.string().optional(),
})

const updateSummaryOpSchema = z.object({
  op: z.literal('update_summary'),
  next: z.string(),
  prev: z.string().optional(),
})

const updateBulletOpSchema = z.object({
  op: z.literal('update_bullet'),
  sectionId: z.string(),
  bulletId: z.string(),
  nextText: z.string(),
  prevText: z.string().optional(),
})

const addBulletAfterOpSchema = z.object({
  op: z.literal('add_bullet_after'),
  sectionId: z.string(),
  afterBulletId: z.string().nullable(),
  bullet: resumeBulletSchema,
})

const addSkillOpSchema = z.object({
  op: z.literal('add_skill'),
  keyword: z.string(),
})

export const tailorChangeOpSchema = z.discriminatedUnion('op', [
  updateTitleOpSchema,
  updateSummaryOpSchema,
  updateBulletOpSchema,
  addBulletAfterOpSchema,
  addSkillOpSchema,
])

export type TailorChangeOp = z.infer<typeof tailorChangeOpSchema>

export const tailorAtsPreviewSchema = z.object({
  beforeScore: z.number().min(0).max(100).nullable().optional(),
  afterScore: z.number().min(0).max(100).nullable().optional(),
  breakdown: z.record(z.unknown()).optional(),
  keywordCoverageBefore: z.number().min(0).max(100).nullable().optional(),
  keywordCoverageAfter: z.number().min(0).max(100).nullable().optional(),
})

export type TailorAtsPreview = z.infer<typeof tailorAtsPreviewSchema>

export const tailorResumeResponseSchema = z.object({
  optimized_resume_data: resumeDataSchema,
  change_list: z.array(tailorChangeOpSchema),
  ats_preview: tailorAtsPreviewSchema.optional(),
  warnings: z.array(z.string()).optional(),
})

export type TailorResumeResponse = z.infer<typeof tailorResumeResponseSchema>


