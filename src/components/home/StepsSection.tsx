const prompts = ['Administer medications', 'Collaborate on care plans', 'Educate patients'] as const

const generatedExamples = [
  {
    original: 'Created work schedule',
    enhanced: 'Coordinated weekly frontline staffing schedules covering 35+ shifts with zero coverage gaps.',
  },
  {
    original: 'Communication',
    enhanced: 'Led cross-functional communications between hiring team, recruiters, and leadership for 15 open roles.',
  },
]

export default function StepsSection() {
  return (
    <section className="section-spacing bg-[#f4f7ff]">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_1fr] lg:items-center lg:gap-16">
          <div className="space-y-6">
            <span className="badge-gradient">GENERATE WITH AI</span>
            <h2 className="text-3xl font-semibold text-text-primary sm:text-4xl">
              Generate resume bullet points that sound polished and personal.
            </h2>
            <p className="text-base leading-relaxed text-text-muted">
              Type a skill, responsibility, or accomplishment and let editresume.io draft wording that impresses hiring
              managers. Adjust tone, add metrics, and save the best version to your resume instantly.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-primary-100 text-center text-xs font-semibold text-primary-700">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Describe what you did</p>
                  <p className="text-sm text-text-muted">Give the AI a keyword or quick sentence about the task.</p>
                </div>
              </li>
              <li className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-primary-100 text-center text-xs font-semibold text-primary-700">
                  2
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Review three polished options</p>
                  <p className="text-sm text-text-muted">
                    Mix and match wording, adjust impact, and slot the best version into your resume.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-primary-100 text-center text-xs font-semibold text-primary-700">
                  3
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Stay aligned with ATS expectations</p>
                  <p className="text-sm text-text-muted">
                    Every suggestion is tuned for clarity, keywords, and measurable results.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="rounded-[32px] border border-border-subtle bg-white p-8 shadow-[0_22px_40px_rgba(15,23,42,0.06)]">
            <label htmlFor="aiPrompt" className="text-sm font-semibold text-text-primary">
              Try it out! Enter text here.
            </label>
            <div className="mt-3 rounded-2xl border border-border-subtle bg-white/80 p-4">
              <textarea
                id="aiPrompt"
                className="h-28 w-full resize-none rounded-xl border border-border-subtle p-4 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="E.g. Managed patient intake for 30+ daily visits"
                readOnly
                value=""
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
              <span>3/3 generates available</span>
              <button className="button-primary text-xs uppercase tracking-[0.25em]" type="button" disabled>
                Generate with AI
              </button>
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">
              Not sure what to write? Try one of these:
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {prompts.map((prompt) => (
                <span
                  key={prompt}
                  className="inline-flex items-center rounded-full border border-border-subtle bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700"
                >
                  {prompt}
                </span>
              ))}
            </div>

            <div className="mt-8 space-y-5">
              {generatedExamples.map((example) => (
                <div key={example.original} className="rounded-2xl border border-border-subtle bg-[#f8fbff] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">Original</p>
                  <p className="mt-2 text-sm text-text-muted">{example.original}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary-600">AI generated</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{example.enhanced}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
