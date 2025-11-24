export default function Pricing() {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary mb-2">PRICING</h2>
          <p className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything is 100% free. Forever. No hidden costs.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="relative bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-200 hover:border-primary/50 transition-all hover:-translate-y-1">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Forever</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                'Upload PDF/DOCX resumes',
                '10+ professional templates',
                'Smart parameters & variables',
                'Real-time preview',
                'Export to PDF & DOCX',
                'No watermarks',
                'No sign-up required',
                'Unlimited exports'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="/editor"
              className="block w-full text-center px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Start Creating
            </a>
          </div>

          {/* Pro (Coming Soon) */}
          <div className="relative bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full shadow-lg">
              Coming Soon
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Features</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">$9</span>
                <span className="text-blue-100">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                'Everything in Free',
                'AI-powered content suggestions',
                'ATS score optimization',
                'Cover letter generator',
                'LinkedIn profile optimizer',
                'Priority support',
                'Custom templates',
                'Team collaboration'
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-50">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="block w-full text-center px-6 py-3 bg-white/20 text-white rounded-xl font-semibold cursor-not-allowed backdrop-blur-sm border border-white/20"
            >
              Notify Me
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-12 text-sm">
          Pro features are in development. Currently, everything is completely free with no limitations.
        </p>
      </div>
    </section>
  )
}
