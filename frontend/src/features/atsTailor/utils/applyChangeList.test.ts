import { describe, expect, it } from 'vitest'
import { applyTailorChangeList } from './applyChangeList'
import type { ResumeData, TailorChangeOp } from '../types/tailorResume'

const baseResume: ResumeData = {
  name: 'Hasan',
  title: 'DevOps Engineer',
  email: 'hasan@example.com',
  phone: '',
  location: '',
  summary: 'Old summary',
  sections: [
    {
      id: 's1',
      title: 'Experience',
      bullets: [
        { id: 'b1', text: '• Did things', params: {} },
        { id: 'b2', text: '• Did more', params: {} },
      ],
    },
  ],
}

describe('applyTailorChangeList', () => {
  it('applies title/summary/bullet updates and inserts bullets', () => {
    const ops: TailorChangeOp[] = [
      { op: 'update_title', next: 'Senior DevOps Engineer' },
      { op: 'update_summary', next: 'New summary' },
      { op: 'update_bullet', sectionId: 's1', bulletId: 'b1', nextText: '• Improved uptime by 20%' },
      {
        op: 'add_bullet_after',
        sectionId: 's1',
        afterBulletId: 'b1',
        bullet: { id: 'b-new', text: '• Added Terraform modules', params: {} },
      },
    ]

    const result = applyTailorChangeList(baseResume, ops)
    expect(result.skippedOps).toHaveLength(0)
    expect(result.resume.title).toBe('Senior DevOps Engineer')
    expect(result.resume.summary).toBe('New summary')
    expect(result.resume.sections[0].bullets.map((b) => b.id)).toEqual(['b1', 'b-new', 'b2'])
    expect(result.resume.sections[0].bullets[0].text).toContain('uptime')
  })

  it('skips ops when target section/bullet is missing', () => {
    const ops: TailorChangeOp[] = [
      { op: 'update_bullet', sectionId: 'missing', bulletId: 'b1', nextText: 'x' },
      { op: 'update_bullet', sectionId: 's1', bulletId: 'missing', nextText: 'x' },
    ]
    const result = applyTailorChangeList(baseResume, ops)
    expect(result.appliedOps).toHaveLength(0)
    expect(result.skippedOps).toHaveLength(2)
  })
})


