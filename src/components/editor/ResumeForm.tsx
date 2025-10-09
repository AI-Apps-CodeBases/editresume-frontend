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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={data.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="px-4 py-2 border rounded-xl"
          />
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
            {section.bullets.map((bullet) => (
              <div key={bullet.id} className="flex gap-2">
                <textarea
                  placeholder="Bullet point (use {{variable}} for replacements)"
                  value={bullet.text}
                  onChange={(e) => updateBullet(section.id, bullet.id, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-xl resize-none text-sm"
                  rows={2}
                />
                <button
                  onClick={() => removeBullet(section.id, bullet.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => addBullet(section.id)}
              className="w-full py-2 border-2 border-dashed rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary"
            >
              + Add Bullet
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-sm font-medium"
      >
        + Add Section
      </button>
    </div>
  )
}

