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
  onChange: (data: ResumeData) => void
  replacements: Record<string, string>
}

export default function ResumeForm({ data, onChange }: Props) {
  const updateField = (field: keyof ResumeData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const addSection = () => {
    const newSection = {
      id: Date.now().toString(),
      title: 'New Section',
      bullets: []
    }
    onChange({ ...data, sections: [...data.sections, newSection] })
  }

  const updateSection = (id: string, title: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s => s.id === id ? { ...s, title } : s)
    })
  }

  const removeSection = (id: string) => {
    onChange({
      ...data,
      sections: data.sections.filter(s => s.id !== id)
    })
  }

  const addBullet = (sectionId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
            }
          : s
      )
    })
  }

  const updateBullet = (sectionId: string, bulletId: string, text: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.map(b =>
                b.id === bulletId ? { ...b, text } : b
              )
            }
          : s
      )
    })
  }

  const removeBullet = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.filter(b => b.id !== bulletId)
            }
          : s
      )
    })
  }

  const moveBulletUp = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s => {
        if (s.id === sectionId) {
          const bullets = [...s.bullets]
          const index = bullets.findIndex(b => b.id === bulletId)
          if (index > 0) {
            [bullets[index], bullets[index - 1]] = [bullets[index - 1], bullets[index]]
          }
          return { ...s, bullets }
        }
        return s
      })
    })
  }

  const moveBulletDown = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s => {
        if (s.id === sectionId) {
          const bullets = [...s.bullets]
          const index = bullets.findIndex(b => b.id === bulletId)
          if (index < bullets.length - 1) {
            [bullets[index], bullets[index + 1]] = [bullets[index + 1], bullets[index]]
          }
          return { ...s, bullets }
        }
        return s
      })
    })
  }

  const toggleBoldText = (sectionId: string, bulletId: string) => {
    onChange({
      ...data,
      sections: data.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.map(b =>
                b.id === bulletId 
                  ? { ...b, text: b.text.includes('**') ? b.text.replace(/\*\*(.*?)\*\*/g, '$1') : `**${b.text}**` }
                  : b
              )
            }
          : s
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-300 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-2xl">👤</div>
          <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
          {!data.name && (
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold animate-pulse">
              ⚠️ Name Required
            </span>
          )}
        </div>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name (e.g., John Doe)"
              value={data.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-semibold transition-all ${
                data.name 
                  ? 'border-green-400 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-200' 
                  : 'border-red-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }`}
              autoFocus
            />
            {!data.name && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                👆 Start here! Enter your name to enable export
              </p>
            )}
          </div>
          <input
            type="text"
            placeholder="Job Title"
            value={data.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="px-4 py-2 border rounded-xl"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={data.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
            <input
              type="text"
              placeholder="Location"
              value={data.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
          </div>
          <textarea
            placeholder="Professional Summary"
            value={data.summary}
            onChange={(e) => updateField('summary', e.target.value)}
            className="px-4 py-2 border rounded-xl resize-none"
            rows={3}
          />
        </div>
      </div>

      {data.sections.map((section) => (
        <div key={section.id} className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={section.title}
              onChange={(e) => updateSection(section.id, e.target.value)}
              className="text-lg font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
            />
            <button
              onClick={() => removeSection(section.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove Section
            </button>
          </div>

          <div className="space-y-3">
            {section.bullets.map((bullet, index) => (
              <div key={bullet.id} className="group relative bg-gray-50 rounded-xl p-4 border">
                <div className="flex gap-3 items-start">
                  {/* Bullet Number & Reorder Controls */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveBulletUp(section.id, bullet.id)}
                        disabled={index === 0}
                        className="w-6 h-6 rounded bg-white border border-gray-300 hover:border-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Move up"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveBulletDown(section.id, bullet.id)}
                        disabled={index === section.bullets.length - 1}
                        className="w-6 h-6 rounded bg-white border border-gray-300 hover:border-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Move down"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Text Input */}
                  <div className="flex-1">
                    <textarea
                      placeholder="Add bullet... Use {{company}} {{tech}} {{metric}} for dynamic text"
                      value={bullet.text}
                      onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-xl resize-none text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      rows={2}
                    />
                    
                    {/* Formatting Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => toggleBoldText(section.id, bullet.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          bullet.text.includes('**') 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Toggle bold text"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                        </svg>
                        Bold
                      </button>
                      
                      <div className="text-xs text-gray-500">
                        {bullet.text.length} chars
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeBullet(section.id, bullet.id)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete bullet"
                  >
                    <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => addBullet(section.id)}
              className="w-full py-3 border-2 border-dashed rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Bullet Point
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add New Section
      </button>
    </div>
  )
}

