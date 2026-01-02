import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/Shared/BackButton'

export const metadata: Metadata = {
  title: 'Contact Us – EditResume',
  description: 'Get in touch with EditResume support team.',
  alternates: { canonical: 'https://staging.editresume.io/contact' },
}

export default function ContactPage() {
  return (
    <div className="w-full px-4 py-16 sm:px-6">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-10 space-y-4">
        <p className="text-sm uppercase tracking-wide text-primary-600">Contact Us</p>
        <h1 className="text-4xl font-bold text-text-primary">
          Get in Touch
        </h1>
        <p className="text-base text-text-secondary">
          We&rsquo;d love to hear from you. Whether you have a question, feedback, or need support, 
          we&rsquo;re here to help.
        </p>
      </div>

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Email Us</h2>
          <div className="text-base leading-7 text-text-secondary">
            <p>
              For general inquiries, support requests, or feedback, please reach out to us at:
            </p>
            <p className="mt-4">
              <a 
                className="text-primary-700 underline hover:text-primary-800 font-medium" 
                href="mailto:hasantutacdevops@gmail.com"
              >
                hasantutacdevops@gmail.com
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Feedback Widget</h2>
          <div className="text-base leading-7 text-text-secondary">
            <p>
              You can also share your feedback directly through our feedback widget. Look for the message 
              icon in the bottom right corner of any page. Click it to open the feedback form where you can:
            </p>
            <ul className="list-disc space-y-2 pl-6 mt-4">
              <li>Rate your experience</li>
              <li>Submit suggestions or bug reports</li>
              <li>Share your thoughts on how we can improve</li>
            </ul>
            <p className="mt-4">
              Your feedback helps us make EditResume better for everyone.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Follow Us</h2>
          <div className="text-base leading-7 text-text-secondary">
            <p>
              Stay connected with us on social media for updates, tips, and community discussions:
            </p>
            <div className="mt-4">
              <a 
                href="https://instagram.com/editresume" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-700 underline hover:text-primary-800 font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>@editresume</span>
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Response Time</h2>
          <div className="text-base leading-7 text-text-secondary">
            <p>
              We aim to respond to all inquiries within 24-48 hours during business days. For urgent 
              matters, please use the feedback widget or email us directly.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Other Resources</h2>
          <div className="text-base leading-7 text-text-secondary">
            <p>You may also find these pages helpful:</p>
            <ul className="list-disc space-y-2 pl-6 mt-4">
              <li>
                <Link href="/privacy" className="text-primary-700 underline hover:text-primary-800">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-primary-700 underline hover:text-primary-800">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

