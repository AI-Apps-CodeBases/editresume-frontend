'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    quote:
      'Resume guidance is crystal clear. I generated five polished bullets in under three minutes and landed interviews the same week.',
    name: 'Gail Ann O’Neill',
    role: 'Marketing Specialist',
  },
  {
    quote:
      'The builder keeps templates tidy while AI fills in the phrasing. It feels like working with a resume coach on standby.',
    name: 'John Kay',
    role: 'Revenue Operations Lead',
  },
  {
    quote:
      'editresume.io let me tailor resumes for different roles without rebuilding from scratch. Recruiters immediately noticed the polish.',
    name: 'Tina Valdez',
    role: 'Product Manager',
  },
] as const

export default function TestimonialsSection() {
  return (
    <section className="section-spacing bg-white">
      <div className="w-full px-[10%]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <span className="badge">WHAT PEOPLE ARE SAYING</span>
          <h2 className="mt-6 text-3xl font-semibold text-text-primary sm:text-4xl">
            Rated highly by job seekers building resumes that get callbacks.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-muted">
            Millions of job seekers trust editresume.io to create professional, ATS-friendly resumes. Every feature is
            tuned with recruiting experts so you can focus on the next offer.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.figure
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex h-full flex-col gap-6 rounded-3xl border border-border-subtle bg-[#f8fbff] p-8 text-left shadow-[0_18px_32px_rgba(15,23,42,0.05)]"
            >
              <blockquote className="text-base leading-relaxed text-text-muted">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-auto border-t border-border-subtle pt-6 text-sm text-text-muted">
                <div className="font-semibold text-text-primary">{testimonial.name}</div>
                <div>{testimonial.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
