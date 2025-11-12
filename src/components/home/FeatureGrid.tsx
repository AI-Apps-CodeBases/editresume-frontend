const features = [
  {
    icon: '🧠',
    title: 'AI that understands your role',
    description:
      'Generate tailored bullet points, summaries, and skills from a short prompt. Keep every suggestion editable before it ships.',
  },
  {
    icon: '🧾',
    title: 'Templates recruiters trust',
    description:
      'Pick from structured, ATS-friendly layouts designed with recruiting partners. Swap colors and styles anytime.',
  },
  {
    icon: '📊',
    title: 'Instant ATS feedback',
    description:
      'Score each version before you send it. We highlight missing keywords and flag formatting issues that block scans.',
  },
  {
    icon: '🤝',
    title: 'Built for sharing and teams',
    description:
      'Invite coaches, mentors, and hiring partners. Comment, suggest, and version resumes without downloading files.',
  },
] as const

export default function FeatureGrid() {
  return (
    <section className="section-spacing bg-white">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <span className="badge">WHY JOB SEEKERS CHOOSE EDITRESUME.IO</span>
          <h2 className="mt-6 text-3xl font-semibold text-text-primary sm:text-4xl">
            Make a resume that gets results in minutes.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-muted">
            Every workflow is tuned with recruiters so you know what to say, how to say it, and why it works. From the
            first draft to the download, we’re your co-pilot.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex h-full flex-col gap-4 rounded-3xl border border-border-subtle bg-[#f8fbff] p-6 shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-[0_10px_22px_rgba(15,23,42,0.08)]">
                {feature.icon}
              </span>
              <h3 className="text-lg font-semibold text-text-primary">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
