export default function Steps() {
  const steps = [
    {
      number: '01',
      title: 'Choose Your Path',
      description: 'Edit your existing resume (upload PDF/DOCX) or create a brand new one from scratch.',
      color: 'bg-blue-500'
    },
    {
      number: '02',
      title: 'Select Template',
      description: 'Pick from 10+ professional templates. Single or two-column layouts available.',
      color: 'bg-purple-500'
    },
    {
      number: '03',
      title: 'Configure & Edit',
      description: 'Set up your layout, add sections, edit content, and customize everything to perfection.',
      color: 'bg-pink-500'
    },
    {
      number: '04',
      title: 'Export & Download',
      description: 'Download as PDF or DOCX. Your resume matches exactly what you see in the preview.',
      color: 'bg-green-500'
    }
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-base font-semibold text-primary mb-2">HOW IT WORKS</h2>
          <p className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Four Simple Steps
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From upload to download in under 5 minutes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent -translate-y-1/2 z-0" />
              )}
              
              <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary/20 group-hover:-translate-y-2">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${step.color} text-white text-2xl font-bold mb-6 shadow-lg transform group-hover:scale-110 transition-transform`}>
                  {step.number}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <a
            href="/editor"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Start Creating Your Resume
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
