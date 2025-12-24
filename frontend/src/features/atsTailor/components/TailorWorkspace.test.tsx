import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TailorWorkspace from './TailorWorkspace'
import type { ResumeData, TailorResumeResponse } from '../types/tailorResume'

const baseResume: ResumeData = {
  name: 'Test User',
  title: 'Engineer',
  email: 't@example.com',
  phone: '',
  location: '',
  summary: 'Old summary',
  sections: [
    { id: 's1', title: 'Experience', bullets: [{ id: 'b1', text: '• Did thing', params: {} }] },
  ],
}

describe('TailorWorkspace', () => {
  it('generates changes, allows selecting, and opens editor with merged resume', async () => {
    const onOpenEditor = vi.fn()

    const response: TailorResumeResponse = {
      optimized_resume_data: { ...baseResume, title: 'Engineer (Tailored)' },
      change_list: [{ op: 'update_title', next: 'Engineer (Tailored)' }],
      ats_preview: { afterScore: 80, beforeScore: 55 },
      warnings: [],
    }

    render(
      <TailorWorkspace
        baseResume={baseResume}
        baseTemplate="tech"
        jobDescription="JD text"
        onOpenEditor={onOpenEditor}
        tailorOverride={async () => response}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /generate optimized copy/i }))

    await waitFor(() => {
      expect(screen.getByText(/change list/i)).toBeInTheDocument()
    })

    const openBtn = screen.getByRole('button', { name: /open editor with selected changes/i })
    await waitFor(() => expect(openBtn).toBeEnabled())

    fireEvent.click(openBtn)
    expect(onOpenEditor).toHaveBeenCalledTimes(1)

    const payload = onOpenEditor.mock.calls[0][0]
    expect(payload.resume.title).toBe('Engineer (Tailored)')
    expect(payload.jobDescription).toBe('JD text')
  })
})


