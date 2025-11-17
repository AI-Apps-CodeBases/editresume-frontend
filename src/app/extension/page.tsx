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
          <span className="inline-block mt-4 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
            Beta Testing
          </span>
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
                <h3 className="text-lg font-semibold text-text-primary mb-2">Download the Extension</h3>
                <p className="text-text-muted mb-3">
                  Click the button below to access the extension files on Google Drive:
                </p>
                <a
                  href="https://drive.google.com/drive/folders/1lVP4OfRESp4r1nFSs_9p7YnUZ-0dKx-7?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Open Google Drive Folder
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <p className="text-sm text-text-muted mt-3">
                  Download the entire extension folder as a ZIP file, then extract it to a location on your computer.
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
                <h3 className="text-lg font-semibold text-text-primary mb-2">Open Chrome Extensions Page</h3>
                <p className="text-text-muted mb-3">
                  Open Google Chrome and navigate to the extensions management page:
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                  <code className="text-sm text-gray-800">chrome://extensions/</code>
                </div>
                <p className="text-sm text-text-muted">
                  Or go to: Chrome Menu → More Tools → Extensions
                </p>
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
                <h3 className="text-lg font-semibold text-text-primary mb-2">Enable Developer Mode</h3>
                <p className="text-text-muted mb-3">
                  Toggle the "Developer mode" switch in the top-right corner of the extensions page.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Developer mode allows you to load unpacked extensions for testing purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Load the Extension</h3>
                <p className="text-text-muted mb-3">
                  Click the "Load unpacked" button that appears after enabling Developer mode.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-text-muted text-sm ml-4">
                  <li>Select the extracted extension folder</li>
                  <li>Make sure you select the folder containing <code className="bg-gray-100 px-1 rounded">manifest.json</code></li>
                  <li>Click "Select Folder" or "Open"</li>
                </ol>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                  5
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
                  <li>Click the pin icon to pin it to your toolbar</li>
                </ol>
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
                <p className="text-text-muted text-sm">Visit any LinkedIn job posting page</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">2.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Click the Extension Icon</p>
                <p className="text-text-muted text-sm">Click the EditResume icon in your Chrome toolbar</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">3.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">Save the Job</p>
                <p className="text-text-muted text-sm">Review the job details and click "Save Job"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-primary-600 font-bold">4.</div>
              <div>
                <p className="text-text-primary font-semibold mb-1">View Matches</p>
                <p className="text-text-muted text-sm">Open editresume.io to see AI-powered resume matching scores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Troubleshooting</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-text-primary mb-1">Extension not loading?</p>
              <p className="text-text-muted">Make sure you extracted the ZIP file and selected the folder containing manifest.json</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Can't see the extension icon?</p>
              <p className="text-text-muted">Pin it from the extensions menu (puzzle piece icon) or check if it's hidden in the extensions dropdown</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Need help?</p>
              <p className="text-text-muted">Contact us at <a href="mailto:support@editresume.io" className="text-primary-600 hover:underline">support@editresume.io</a></p>
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

