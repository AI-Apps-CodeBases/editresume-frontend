'use client'

interface ResumeData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Array<{
    id: string
    title: string
    bullets: Array<{
      id: string
      text: string
      params: Record<string, string>
    }>
  }>
}

interface Props {
  data: ResumeData
  replacements: Record<string, string>
  template?: string
}

export default function PreviewPanel({ data, replacements, template = 'clean' }: Props) {
  const applyReplacements = (text: string) => {
    let result = text
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  const headerAlign = template === 'clean' || template === 'two-column' || template === 'compact' ? 'center' : 'left'
  const headerBorder = template === 'clean' ? 'border-b-2 border-black' : template === 'minimal' ? 'border-b border-gray-300' : 'border-b'
  const sectionUppercase = template === 'clean' || template === 'compact'
  const fontFamily = template === 'clean' ? 'font-serif' : 'font-sans'
  const isTwoColumn = template === 'two-column'

  return (
    <div className="bg-white rounded-2xl border shadow-lg p-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500">Live Preview ({template})</h3>
      </div>

      <div className={`space-y-6 ${fontFamily}`}>
        {data.name && (
          <div className={`${headerAlign === 'center' ? 'text-center' : 'text-left'} ${headerBorder} pb-4`}>
            <h1 className="text-3xl font-bold">{applyReplacements(data.name)}</h1>
            {data.title && <p className="text-lg text-gray-700 mt-1">{applyReplacements(data.title)}</p>}
            <div className={`flex items-center ${headerAlign === 'center' ? 'justify-center' : 'justify-start'} gap-3 mt-2 text-sm text-gray-600`}>
              {data.email && <span>{applyReplacements(data.email)}</span>}
              {data.phone && <span>• {applyReplacements(data.phone)}</span>}
              {data.location && <span>• {applyReplacements(data.location)}</span>}
            </div>
          </div>
        )}

        {isTwoColumn ? (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              {data.summary && (
                <div>
                  <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                    Professional Summary
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {applyReplacements(data.summary)}
                  </p>
                </div>
              )}

              {data.sections.filter((_, index) => index % 2 === 0).map((section) => (
                <div key={section.id}>
                  <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                    {applyReplacements(section.title)}
                  </h2>
                  <ul className="space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.id} className="text-sm leading-relaxed flex">
                        <span className="mr-2">•</span>
                        <span className="flex-1">{applyReplacements(bullet.text)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              {data.sections.filter((_, index) => index % 2 === 1).map((section) => (
                <div key={section.id}>
                  <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                    {applyReplacements(section.title)}
                  </h2>
                  <ul className="space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.id} className="text-sm leading-relaxed flex">
                        <span className="mr-2">•</span>
                        <span className="flex-1">{applyReplacements(bullet.text)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {data.summary && (
              <div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {applyReplacements(data.summary)}
                </p>
              </div>
            )}

            {data.sections.map((section) => (
              <div key={section.id}>
                <h2 className={`text-lg font-bold ${sectionUppercase ? 'uppercase' : ''} tracking-wide border-b ${template === 'clean' ? 'border-black' : 'border-gray-300'} pb-1 mb-3`}>
                  {applyReplacements(section.title)}
                </h2>
                <ul className="space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.id} className="text-sm leading-relaxed flex">
                      <span className="mr-2">•</span>
                      <span className="flex-1">{applyReplacements(bullet.text)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}

        {!data.name && !data.title && data.sections.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Start editing to see your resume preview</p>
          </div>
        )}
      </div>
    </div>
  )
}

