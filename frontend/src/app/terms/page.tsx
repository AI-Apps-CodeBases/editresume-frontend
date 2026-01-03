import type { Metadata } from 'next'
import BackButton from '@/components/Shared/BackButton'

const PUBLIC_BASE_URL = 'https://staging.editresume.io'
const TERMS_URL = `${PUBLIC_BASE_URL}/terms`
const LAST_UPDATED = 'January 2025'

export const metadata: Metadata = {
  title: 'Terms of Service – EditResume',
  description: 'Terms and conditions for using EditResume services.',
  alternates: { canonical: TERMS_URL },
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
    <div className="text-base leading-7 text-text-secondary">{children}</div>
  </section>
)

export default function TermsPage() {
  return (
    <div className="w-full px-[10%] py-16">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-10 space-y-4">
        <p className="text-sm uppercase tracking-wide text-primary-600">Terms of Service</p>
        <h1 className="text-4xl font-bold text-text-primary">
          Terms and Conditions
        </h1>
        <p className="text-sm text-text-muted">Last updated: {LAST_UPDATED}</p>
        <p className="text-base text-text-secondary">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the EditResume web application, 
          Chrome extension, and related services (collectively, the &ldquo;Services&rdquo;) provided by EditResume, Inc. 
          (&ldquo;EditResume,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;). By accessing or using our Services, you agree to be bound by these Terms.
        </p>
      </div>

      <div className="space-y-10">
        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using the Services, you agree to comply with and be bound by these Terms. 
            If you do not agree to these Terms, you may not access or use the Services. We reserve the right 
            to modify these Terms at any time, and such modifications will be effective immediately upon posting.
          </p>
        </Section>

        <Section title="2. Description of Services">
          <p>
            EditResume provides an AI-powered resume editing platform that allows users to create, edit, 
            and export resumes. Our Services include:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Resume creation and editing tools</li>
            <li>AI-powered content suggestions and improvements</li>
            <li>Resume templates and formatting options</li>
            <li>Export functionality (PDF, DOCX)</li>
            <li>Job description matching and ATS scoring</li>
            <li>Chrome extension for saving job postings</li>
          </ul>
        </Section>

        <Section title="3. User Accounts">
          <p>
            To access certain features of the Services, you may be required to create an account. You are 
            responsible for maintaining the confidentiality of your account credentials and for all activities 
            that occur under your account. You agree to:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information to keep it accurate</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Be responsible for all activities under your account</li>
          </ul>
        </Section>

        <Section title="4. User Content">
          <p>
            You retain ownership of all content you create, upload, or submit through the Services (&ldquo;User Content&rdquo;). 
            By using the Services, you grant EditResume a non-exclusive, worldwide, royalty-free license to use, 
            store, and process your User Content solely for the purpose of providing and improving the Services.
          </p>
          <p className="mt-3">
            You are solely responsible for your User Content and represent that you have all necessary rights 
            to submit such content. You agree not to submit content that:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Violates any law or regulation</li>
            <li>Infringes on the rights of others</li>
            <li>Contains malicious code or viruses</li>
            <li>Is defamatory, obscene, or offensive</li>
          </ul>
        </Section>

        <Section title="5. AI-Generated Content">
          <p>
            Our Services use artificial intelligence to generate suggestions and improvements. AI-generated 
            content is provided &ldquo;as is&rdquo; and may not always be accurate or appropriate. You are responsible 
            for reviewing and verifying all AI-generated content before using it. EditResume does not guarantee 
            the accuracy, completeness, or suitability of AI-generated content.
          </p>
        </Section>

        <Section title="6. Subscription and Payment">
          <p>
            Some features of the Services may require a paid subscription. By subscribing, you agree to pay 
            the fees specified at the time of purchase. Subscriptions automatically renew unless cancelled. 
            You may cancel your subscription at any time through your account settings or by contacting support.
          </p>
          <p className="mt-3">
            All fees are non-refundable except as required by law. We reserve the right to change our pricing 
            with reasonable notice to existing subscribers.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The Services, including all software, designs, text, graphics, and other content, are owned by 
            EditResume or its licensors and are protected by copyright, trademark, and other intellectual 
            property laws. You may not copy, modify, distribute, or create derivative works of the Services 
            without our express written permission.
          </p>
        </Section>

        <Section title="8. Prohibited Uses">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use the Services for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to the Services or related systems</li>
            <li>Interfere with or disrupt the Services</li>
            <li>Use automated systems to access the Services without permission</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Services</li>
            <li>Resell or redistribute the Services without authorization</li>
          </ul>
        </Section>

        <Section title="9. Termination">
          <p>
            We may suspend or terminate your access to the Services at any time, with or without cause or 
            notice, for any reason including violation of these Terms. Upon termination, your right to use 
            the Services will immediately cease. You may also terminate your account at any time by deleting 
            it through your account settings.
          </p>
        </Section>

        <Section title="10. Disclaimer of Warranties">
          <p>
            THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES 
            WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, EDITRESUME SHALL NOT BE LIABLE FOR ANY INDIRECT, 
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, 
            WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE 
            LOSSES RESULTING FROM YOUR USE OF THE SERVICES.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify and hold harmless EditResume, its officers, directors, employees, and agents 
            from any claims, damages, losses, liabilities, and expenses (including attorneys&rsquo; fees) arising 
            out of your use of the Services, your User Content, or your violation of these Terms.
          </p>
        </Section>

        <Section title="13. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of 
            California, United States, without regard to its conflict of law provisions. Any disputes arising 
            from these Terms or the Services shall be resolved in the courts of San Francisco, California.
          </p>
        </Section>

        <Section title="14. Changes to Terms">
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of material changes 
            by posting the updated Terms on this page and updating the &ldquo;Last updated&rdquo; date. Your continued 
            use of the Services after such changes constitutes acceptance of the modified Terms.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="mt-3">
            Email:{' '}
            <a className="text-primary-700 underline" href="mailto:hasantutacdevops@gmail.com">
              hasantutacdevops@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  )
}

