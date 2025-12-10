import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tutorial - Learn how to use EditResume | editresume.io',
  description: 'Watch our tutorial video to learn how to create and edit your resume using EditResume\'s powerful editor with AI assistance.',
  openGraph: {
    title: 'Tutorial - Learn how to use EditResume',
    description: 'Watch our tutorial video to learn how to create and edit your resume using EditResume\'s powerful editor with AI assistance.',
    type: 'website',
    url: 'https://editresume.io/tutorial',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tutorial - Learn how to use EditResume',
    description: 'Watch our tutorial video to learn how to create and edit your resume using EditResume\'s powerful editor with AI assistance.',
  },
}

export default function TutorialLayout({ children }: { children: React.ReactNode }) {
  return children
}

