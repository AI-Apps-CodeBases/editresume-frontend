export default function Features() {
  const features = [
    {
      icon: '📤',
      title: 'Upload & Parse',
      description: 'Upload your existing resume in PDF or DOCX format. Our smart parser extracts all content automatically.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🎨',
      title: '10+ Templates',
      description: 'Choose from professional templates: ATS-friendly, Modern, Executive, Technical, Creative, and more.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: '🔄',
      title: 'Smart Parameters',
      description: 'Use {{company}}, {{metric}}, {{tech}} variables to quickly customize your resume for each job application.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: '👁️',
      title: 'Live Preview',
      description: 'See changes instantly with our real-time preview. Zoom in/out, adjust layout, reorder sections with drag-and-drop.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: '📥',
      title: 'Export Anywhere',
      description: 'Download as PDF for applications or DOCX for further editing. All templates work perfectly in both formats.',
      gradient: 'from-indigo-500 to-blue-500'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'No sign-up required. Edit and export in seconds. All processing happens instantly in your browser.',
      gradient: 'from-yellow-500 to-orange-500'
    }
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary mb-2">FEATURES</h2>
          <p className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to Succeed
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional resume creation tools that actually work
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-transparent hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />
              
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} mb-5 text-2xl shadow-lg`}>
                {feature.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
