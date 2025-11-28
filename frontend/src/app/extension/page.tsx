import Link from 'next/link'
import Image from 'next/image'

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f4f7ff] to-white">
      <div className="container-padding mx-auto max-w-4xl py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <Image 
              src="/extension-icon.png" 
              alt="EditResume Extension" 
              width={64} 
              height={64}
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            EditResume Chrome Extension
          </h1>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            Save LinkedIn job descriptions directly to editresume.io and run AI-powered resume matching
          </p>
          <div className="mt-6">
            <a
              href="https://chromewebstore.google.com/detail/editresume-job-saver/aecnknpdmopjemcdadfnlpoeldnehljp?utm_source=ext_app_menu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-base shadow-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Install from Chrome Web Store
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <p className="mt-3 text-sm text-text-muted">
              One-click installation • Free • No account required to install
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white rounded-2xl border border-border-subtle shadow-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Installation Instructions</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Install from Chrome Web Store</h3>
                <p className="text-text-muted mb-3">
                  Click the button below to open the extension page in the Chrome Web Store:
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/editresume-job-saver/aecnknpdmopjemcdadfnlpoeldnehljp?utm_source=ext_app_menu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-base"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Add to Chrome
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <p className="text-sm text-text-muted mt-3">
                  This will open the Chrome Web Store page where you can install the extension with one click.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Click "Add to Chrome"</h3>
                <p className="text-text-muted mb-3">
                  On the Chrome Web Store page, click the blue "Add to Chrome" button in the top-right corner.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You may see a confirmation dialog asking for permissions. Click "Add extension" to proceed.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Pin the Extension</h3>
                <p className="text-text-muted mb-3">
                  Once installed, pin the extension to your Chrome toolbar for easy access:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-text-muted text-sm ml-4">
                  <li>Click the puzzle piece icon (🧩) in Chrome's toolbar</li>
                  <li>Find "EditResume Job Saver" in the list</li>
                  <li>Click the pin icon (📌) to pin it to your toolbar</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-2xl border border-border-subtle shadow-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Setup & Configuration</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">1.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Sign in to editresume.io</p>
                <p className="text-text-muted text-sm">Make sure you have an account at <a href="https://editresume.io" className="text-primary-600 hover:underline">editresume.io</a> and are signed in</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">2.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Open Extension Popup</p>
                <p className="text-text-muted text-sm">Click the EditResume icon in your Chrome toolbar to open the extension popup</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">3.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Authenticate</p>
                <p className="text-text-muted text-sm">If prompted, sign in to your editresume.io account through the extension</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">4.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">You're Ready!</p>
                <p className="text-text-muted text-sm">The extension is now connected to your account and ready to save jobs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-white rounded-2xl border border-border-subtle shadow-card p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">How to Use</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">1.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Browse LinkedIn Jobs</p>
                <p className="text-text-muted text-sm">Visit any LinkedIn job posting page (e.g., linkedin.com/jobs/view/...)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">2.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Click the Extension Icon</p>
                <p className="text-text-muted text-sm">Click the EditResume Job Saver icon in your Chrome toolbar (or use the extension popup)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">3.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Save the Job</p>
                <p className="text-text-muted text-sm">Review the extracted job details and click "Save Job" to add it to your editresume.io account</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">4.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">View Matches & Analysis</p>
                <p className="text-text-muted text-sm">Go to <a href="https://editresume.io" className="text-primary-600 hover:underline">editresume.io</a> and navigate to the Jobs section to see AI-powered resume matching scores and improvement suggestions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Troubleshooting</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-text-primary mb-1">Extension not installing?</p>
              <p className="text-text-muted">Make sure you're using Google Chrome (not other Chromium-based browsers). The extension requires Chrome version 88 or later.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Can't see the extension icon?</p>
              <p className="text-text-muted">Pin it from the extensions menu (puzzle piece icon 🧩) in Chrome's toolbar. Click the puzzle piece, find "EditResume Job Saver", and click the pin icon.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Extension not working on LinkedIn?</p>
              <p className="text-text-muted">Make sure you're on a LinkedIn job posting page (not the jobs search page). The extension works on individual job detail pages.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Jobs not syncing to editresume.io?</p>
              <p className="text-text-muted">Check that you're signed in to your editresume.io account in the extension popup. You may need to re-authenticate.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Need help?</p>
              <p className="text-text-muted">Contact us at <a href="mailto:support@editresume.io" className="text-primary-600 hover:underline">support@editresume.io</a> or visit our <a href="https://editresume.io" className="text-primary-600 hover:underline">support page</a></p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

