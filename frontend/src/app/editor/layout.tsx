import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resume Editor',
  description: 'Edit and customize your resume with our powerful editor. Export to PDF or DOCX.',
}

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children
}

