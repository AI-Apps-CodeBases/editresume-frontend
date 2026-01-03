import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import BackButton from '@/components/Shared/BackButton'

const PUBLIC_BASE_URL = 'https://staging.editresume.io'
const PRIVACY_URL = `${PUBLIC_BASE_URL}/privacy`
const LAST_UPDATED = 'November 19, 2025'

export const metadata: Metadata = {
  title: 'Privacy Policy – EditResume',
  description: 'How EditResume collects, uses, stores, and shares data.',
  alternates: { canonical: PRIVACY_URL },
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
    <div className="text-base leading-7 text-text-secondary">{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <div className="w-full px-[10%] py-16">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-10 space-y-4">
        <p className="text-sm uppercase tracking-wide text-primary-600">Privacy Policy</p>
        <h1 className="text-4xl font-bold text-text-primary">
          How EditResume handles your data
        </h1>
        <p className="text-sm text-text-muted">Last updated: {LAST_UPDATED}</p>
        <p className="text-base text-text-secondary">
          This Privacy Policy explains how EditResume, Inc. (&ldquo;EditResume,&rdquo; &ldquo;we,&rdquo; or
          &ldquo;us&rdquo;) collects, uses, shares, and safeguards information when you use the
          editresume.io web application, the EditResume Job Saver Chrome extension, and related
          services (collectively, the &ldquo;Services&rdquo;).
        </p>
      </div>

      <div className="space-y-10">
        <Section title="1. Data we collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Account data you provide:</strong> email address, display name, workspace or
              team selections, billing preferences, and support communications.
            </li>
            <li>
              <strong>Content data you submit:</strong> resumes, cover letters, job descriptions, AI
              prompts, and feedback you store inside the app.
            </li>
            <li>
              <strong>Extension-collected data:</strong> when you click &ldquo;Save Job&rdquo; on LinkedIn job
              pages, we capture the job title, company, location, salary information, description,
              posting URL, and the timestamp of the save action. The extension does not read or
              transmit content from non-job pages.
            </li>
            <li>
              <strong>Device and usage data:</strong> IP address, browser/OS version, referring URLs,
              crash logs, and feature usage metrics collected via HTTPS requests and server logs.
            </li>
            <li>
              <strong>Payment data:</strong> limited billing information handled by Stripe (card
              holder name, billing ZIP/postal code, last four digits). Full card details never reach
              EditResume servers.
            </li>
          </ul>
        </Section>

        <Section title="2. How we use the data">
          <ul className="list-disc space-y-2 pl-6">
            <li>Authenticate you, maintain your workspace, and sync data across devices.</li>
            <li>
              Generate AI-powered resume insights, grammar fixes, and job matches based on the
              content you provide.
            </li>
            <li>
              Operate the Chrome extension, including securely storing OAuth tokens inside Chrome
              sync storage and routing LinkedIn job data to your EditResume account.
            </li>
            <li>Process payments, manage subscriptions, and handle invoices through Stripe.</li>
            <li>Monitor usage, prevent abuse, troubleshoot issues, and comply with legal requests.</li>
            <li>
              Send transactional emails (account alerts, export notifications) and service updates.
            </li>
          </ul>
          <p className="mt-4">
            For users in the EEA or UK, we rely on the following legal bases: performance of a
            contract (providing the Services), legitimate interests (service quality, security,
            fraud prevention), and consent (marketing emails where applicable). You may withdraw
            consent at any time by unsubscribing or emailing support@editresume.io.
          </p>
        </Section>

        <Section title="3. Extension-specific details">
          <ul className="list-disc space-y-2 pl-6">
            <li>The extension activates only on linkedin.com job URLs or domains you explicitly add.</li>
            <li>
              Authentication tokens are scoped to your account, stored via Chrome storage.sync, and
              encrypted in transit to our servers.
            </li>
            <li>
              You can delete extension data by opening chrome://extensions → EditResume Job Saver →
              Remove, or by clearing the extension data from the options page.
            </li>
            <li>
              Removing the extension or revoking access in your EditResume account immediately
              invalidates stored tokens.
            </li>
          </ul>
        </Section>

        <Section title="4. When we share data">
          <p>
            We do not sell personal data. We share only what is necessary with trusted processors:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Google Firebase for authentication and secure session management.</li>
            <li>Stripe for payments, invoicing, and fraud prevention.</li>
            <li>OpenAI (and similar AI vendors) to generate improvements you request.</li>
            <li>Hosting and infrastructure providers (Render, Vercel, AWS or equivalent) to run the Services.</li>
            <li>Customer support and analytics tooling that helps us respond to issues.</li>
          </ul>
          <p>
            Each processor is bound by data processing agreements that restrict their use of your
            data to the services they provide to us. We may disclose information if required by law,
            to protect rights and safety, or in connection with a merger or acquisition.
          </p>
        </Section>

        <Section title="5. Data retention">
          <p>
            We retain account and content data while your account is active. You may delete resumes,
            job saves, or your whole account at any time from <strong>Settings → Account →
            Delete Account</strong> inside the web app. If you request deletion via
            support@editresume.io we will remove or anonymize personal data within 30 days unless we
            must retain it for legal, security, or billing purposes.
          </p>
        </Section>

        <Section title="6. Security">
          <p>
            Data is encrypted in transit (TLS 1.2+) and at rest. Access to production systems is
            limited to trained personnel using role-based controls and audit logging. We regularly
            review dependencies, rotate credentials, and monitor for suspicious behavior. No
            transmission method is 100% secure, so we encourage you to use strong, unique passwords
            and enable browser security features.
          </p>
        </Section>

        <Section title="7. International transfers">
          <p>
            EditResume is based in the United States. When you use the Services from other regions,
            your data may be transferred to the U.S. or other countries where our processors operate.
            We rely on Standard Contractual Clauses or equivalent safeguards for cross-border data
            transfers.
          </p>
        </Section>

        <Section title="8. Your rights and choices">
          <ul className="list-disc space-y-2 pl-6">
            <li>Access: download your resume and job data from the dashboard.</li>
            <li>Correction: update profile details or edit stored content at any time.</li>
            <li>Deletion: remove individual files or delete your account via settings or email.</li>
            <li>Objection and restriction: opt out of marketing emails or limit processing by contacting us.</li>
            <li>Portability: request a machine-readable export of your data.</li>
          </ul>
          <p className="mt-4">
            Please email <a className="text-primary-700 underline" href="mailto:support@editresume.io">support@editresume.io</a>{' '}
            with the subject line &ldquo;Privacy Request&rdquo; to exercise these rights. We may need to
            verify your identity before fulfilling a request.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            The Services are intended for individuals 16 and older. We do not knowingly collect data
            from children under 16. If we learn that we processed such data, we will delete it.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We will post any privacy updates on this page and revise the &ldquo;Last updated&rdquo; date.
            Material changes may also be communicated via email or in-app notices. Continued use of
            the Services after changes become effective constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            EditResume, Inc.<br />
            2261 Market Street #4836<br />
            San Francisco, CA 94114<br />
            United States
          </p>
          <p className="mt-3">
            Email:{' '}
            <a className="text-primary-700 underline" href="mailto:support@editresume.io">
              support@editresume.io
            </a>
          </p>
          <p>
            Website:{' '}
            <a className="text-primary-700 underline" href={PUBLIC_BASE_URL}>
              {PUBLIC_BASE_URL}
            </a>
          </p>
        </Section>
      </div>
    </div>
  )
}

