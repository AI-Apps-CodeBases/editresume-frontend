import { UploadIcon, PaletteIcon, RefreshIcon, EyeIcon, DownloadIcon, ZapIcon } from '@/components/Icons'

export default function Features() {
  const features = [
    {
      icon: UploadIcon,
      title: 'Upload & Parse',
      description: 'Upload your existing resume in PDF or DOCX format. Our smart parser extracts all content automatically.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: PaletteIcon,
      title: '15 Industry Templates',
      description: 'Choose from templates designed for Tech, Healthcare, Finance, Creative, Legal, and more industries.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: RefreshIcon,
      title: 'Smart Parameters',
      description: 'Use {{company}}, {{metric}}, {{tech}} variables to quickly customize your resume for each job application.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: EyeIcon,
      title: 'Live Preview',
      description: 'See changes instantly with our real-time preview. Zoom in/out, adjust layout, reorder sections with drag-and-drop.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: DownloadIcon,
      title: 'Export Anywhere',
      description: 'Download as PDF for applications or DOCX for further editing. Works perfectly in both formats.',
      gradient: 'from-indigo-500 to-blue-500'
    },
    {
      icon: ZapIcon,
      title: 'Lightning Fast',
      description: 'No sign-up required. Edit and export in seconds. All processing happens instantly in your browser.',
      gradient: 'from-yellow-500 to-orange-500'
    }
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-primary mb-2 tracking-wider">FEATURES</h2>
          <p className="text-heading text-gray-900 mb-4">
            Everything You Need to Succeed
          </p>
          <p className="text-body-large text-gray-600 max-w-2xl mx-auto">
            Professional resume creation tools that actually work
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-2xl card-spacing shadow-sm card-hover border border-gray-100 animate-fade-in-up stagger-${index + 1}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
              
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {(() => {
                  const IconComponent = feature.icon
                  return <IconComponent size={32} color="white" />
                })()}
              </div>
              
              <h3 className="text-heading text-gray-900 mb-4">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
