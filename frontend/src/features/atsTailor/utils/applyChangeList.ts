import type { ResumeData, ResumeSection, TailorChangeOp } from '../types/tailorResume'

type ApplyResult = {
  resume: ResumeData
  appliedOps: TailorChangeOp[]
  skippedOps: Array<{ op: TailorChangeOp; reason: string }>
}

const cloneResume = (resume: ResumeData): ResumeData => ({
  ...resume,
  sections: resume.sections.map((s) => ({
    ...s,
    bullets: s.bullets.map((b) => ({ ...b, params: b.params ? { ...b.params } : undefined })),
    params: s.params ? { ...s.params } : undefined,
  })),
  fieldsVisible: resume.fieldsVisible ? { ...resume.fieldsVisible } : undefined,
})

const findSectionIndex = (sections: ResumeSection[], sectionId: string): number =>
  sections.findIndex((s) => s.id === sectionId)

export function applyTailorChangeList(baseResume: ResumeData, ops: TailorChangeOp[]): ApplyResult {
  const resume = cloneResume(baseResume)
  const appliedOps: TailorChangeOp[] = []
  const skippedOps: Array<{ op: TailorChangeOp; reason: string }> = []

  for (const op of ops) {
    switch (op.op) {
      case 'update_title': {
        resume.title = op.next
        appliedOps.push(op)
        break
      }
      case 'update_summary': {
        resume.summary = op.next
        appliedOps.push(op)
        break
      }
      case 'update_bullet': {
        const sectionIdx = findSectionIndex(resume.sections, op.sectionId)
        if (sectionIdx === -1) {
          skippedOps.push({ op, reason: 'Section not found' })
          break
        }
        const bulletIdx = resume.sections[sectionIdx].bullets.findIndex((b) => b.id === op.bulletId)
        if (bulletIdx === -1) {
          skippedOps.push({ op, reason: 'Bullet not found' })
          break
        }
        resume.sections[sectionIdx].bullets[bulletIdx] = {
          ...resume.sections[sectionIdx].bullets[bulletIdx],
          text: op.nextText,
        }
        appliedOps.push(op)
        break
      }
      case 'add_bullet_after': {
        const sectionIdx = findSectionIndex(resume.sections, op.sectionId)
        if (sectionIdx === -1) {
          skippedOps.push({ op, reason: 'Section not found' })
          break
        }
        const bullets = resume.sections[sectionIdx].bullets
        if (op.afterBulletId === null) {
          bullets.splice(0, 0, op.bullet)
          appliedOps.push(op)
          break
        }
        const afterIdx = bullets.findIndex((b) => b.id === op.afterBulletId)
        if (afterIdx === -1) {
          skippedOps.push({ op, reason: 'afterBulletId not found' })
          break
        }
        bullets.splice(afterIdx + 1, 0, op.bullet)
        appliedOps.push(op)
        break
      }
      case 'add_skill': {
        const skillsSection =
          resume.sections.find((s) => s.title.toLowerCase().includes('skill')) ?? null
        const bullet = { id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: `• ${op.keyword}` }

        if (skillsSection) {
          skillsSection.bullets.push(bullet)
          appliedOps.push(op)
          break
        }

        resume.sections.push({
          id: `section-skills-${Date.now()}`,
          title: 'Skills',
          bullets: [bullet],
        })
        appliedOps.push(op)
        break
      }
      default: {
        const neverOp: never = op
        skippedOps.push({ op: neverOp, reason: 'Unsupported op' })
      }
    }
  }

  return { resume, appliedOps, skippedOps }
}

export function invertTailorOps(ops: TailorChangeOp[], base: ResumeData): TailorChangeOp[] {
  const inverted: TailorChangeOp[] = []
  for (const op of ops) {
    switch (op.op) {
      case 'update_title':
        if (op.prev !== undefined) inverted.push({ op: 'update_title', next: op.prev })
        break
      case 'update_summary':
        if (op.prev !== undefined) inverted.push({ op: 'update_summary', next: op.prev })
        break
      case 'update_bullet': {
        if (op.prevText !== undefined) {
          inverted.push({
            op: 'update_bullet',
            sectionId: op.sectionId,
            bulletId: op.bulletId,
            nextText: op.prevText,
          })
        }
        break
      }
      case 'add_bullet_after':
        // Rollback for insert requires a delete op, which we intentionally don't support in v1.
        break
      case 'add_skill':
        // Rollback for insert requires delete op.
        break
      default: {
        const neverOp: never = op
        void neverOp
      }
    }
  }
  void base
  return inverted
}


