import Link from 'next/link'
const resources = [
  {
    title: 'How to write a resume recruiters love',
    href: '#',
    date: 'Updated October 30, 2025',
  },
  {
    title: 'Top entry-level careers that are AI-resistant',
    href: '#',
    date: 'Updated October 21, 2025',
  },
  {
    title: 'Three best AI cover letter generators for 2025',
    href: '#',
    date: 'Updated May 28, 2025',
  },
] as const

export default function CollaborationSection() {
  return (
    <section id="resources" className="section-spacing bg-[#f4f7ff]">
      <div className="w-full px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_1fr] lg:items-center lg:gap-16">
          <div>
            <span className="badge-gradient">RESOURCE CENTER</span>
            <h2 className="mt-6 text-3xl font-semibold text-text-primary sm:text-4xl">
              Resume help, interview prep, and job search tips from certified experts.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-muted">
              Browse guides written by CPRW-certified writers. Each article includes actionable steps to tailor your
              resume, write cover letters, and navigate interviews with confidence.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-text-muted">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  43M+
                </span>
                Resumes created with editresume.io
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  ATS
                </span>
                Templates tested to pass applicant tracking systems
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  CPRW
                </span>
                Advice reviewed by Certified Professional Resume Writers
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {resources.map((resource, index) => (
              <Link
                key={`${resource.title}-${index}`}
                href={resource.href}
                className="block rounded-3xl border border-border-subtle bg-white px-6 py-5 shadow-[0_18px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-primary-200"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">{resource.date}</p>
                <p className="mt-3 text-lg font-semibold text-text-primary">{resource.title}</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary-600">
                  Read guide →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
