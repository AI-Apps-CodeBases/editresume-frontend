import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy – editresume.io',
  description: 'Privacy Policy for editresume.io',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-4xl font-bold text-text-primary">Privacy Policy</h1>
      <p className="mb-8 text-sm text-text-muted">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-slate max-w-none space-y-8 text-text-secondary">
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Introduction</h2>
          <p>
            At editresume.io, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our website, services, and browser extension.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Information We Collect</h2>
          <h3 className="mb-3 text-xl font-semibold text-text-primary">Data You Provide</h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>Account information (email address, name)</li>
            <li>Resume content and job descriptions you save</li>
            <li>Authentication tokens for service access</li>
            <li>Settings and preferences</li>
          </ul>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-text-primary">Data Collected Automatically</h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>Browser extension: Job description data extracted from LinkedIn pages you visit</li>
            <li>Usage data: How you interact with our services</li>
            <li>Technical data: IP address, browser type, device information</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To provide and maintain our services</li>
            <li>To process and store your resume data and job descriptions</li>
            <li>To authenticate and manage your account</li>
            <li>To improve our services and user experience</li>
            <li>To communicate with you about your account and our services</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Data Storage and Security</h2>
          <p>
            We store your data securely using industry-standard security measures. Your authentication tokens are stored locally in your browser using Chrome&apos;s secure storage API. Resume and job description data is stored on our servers with encryption in transit and at rest.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Browser Extension Specific Information</h2>
          <p>
            Our browser extension (EditResume Job Saver) collects the following data:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Job title, company name, and job description from LinkedIn pages you visit</li>
            <li>Job application URLs and metadata</li>
            <li>Authentication tokens stored locally in your browser</li>
          </ul>
          <p className="mt-4">
            This data is only collected when you actively use the extension to save job descriptions. The extension only accesses LinkedIn job pages and does not collect data from other websites.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Third-Party Services</h2>
          <p>
            We may use third-party services for authentication, analytics, and hosting. These services have their own privacy policies governing the use of your information.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Opt-out of certain data collection</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at <a href="mailto:support@editresume.io" className="text-primary-700 underline">support@editresume.io</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide our services. You can delete your account and data at any time through your account settings or by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Children&apos;s Privacy</h2>
          <p>
            Our services are not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">Contact Us</h2>
          <p>
            If you have questions about this privacy policy, please contact us at:
          </p>
          <p className="mt-2">
            Email: <a href="mailto:support@editresume.io" className="text-primary-700 underline">support@editresume.io</a>
          </p>
          <p>
            Website: <a href="https://staging.editresume.io" className="text-primary-700 underline">https://staging.editresume.io</a>
          </p>
        </section>
      </div>
    </div>
  )
}

