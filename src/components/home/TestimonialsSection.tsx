const testimonials = [
  {
    quote:
      'I stopped juggling five Google Docs and shipping PDFs back and forth. editresume.io gives me a live, collaborative resume OS that feels like a product workflow.',
    name: 'Kenisha Mathur',
    role: 'Staff PM @ Linear',
    badge: 'Premium',
  },
  {
    quote:
      'The ATS insight panel alone is worth the switch. I tailor my resume in minutes, sync the job post, and watch the callback rate climb.',
    name: 'Hugo Park',
    role: 'Head of Operations @ Hyper',
    badge: 'Team',
  },
  {
    quote:
      'We run hiring sprints. The version control and sharing links make it effortless to collaborate and iterate. Feels like Notion + Figma but for resumes.',
    name: 'Maria Ortega',
    role: 'Recruiting Lead @ Ramp',
    badge: 'Collab',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="badge">TEAMS LOVING THE SWITCH</span>
          <h2 className="mt-6 max-w-3xl text-heading text-white">
            Built with hiring managers, operators, and builders who obsess over signal.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-text-secondary">
            Join thousands of operators moving faster with editresume.io. The new dark workspace makes every session feel
            cinematic.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="relative flex h-full flex-col gap-6 rounded-[28px] border border-border-subtle bg-surface-500/70 p-8 shadow-card transition hover:border-border-strong hover:shadow-glow"
            >
              <div className="absolute right-6 top-6 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">
                {testimonial.badge}
              </div>
              <blockquote className="text-sm leading-relaxed text-text-secondary">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-auto pt-6 text-left text-sm text-text-secondary">
                <div className="font-semibold text-text-primary">{testimonial.name}</div>
                <div>{testimonial.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}


