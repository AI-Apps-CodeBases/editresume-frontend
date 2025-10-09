'use client'

interface Section {
  id: string
  title: string
}

interface Props {
  sections: Section[]
  onReorder: (sections: Section[]) => void
}

export default function SectionReorder({ sections, onReorder }: Props) {
  const moveUp = (index: number) => {
    if (index === 0) return
    const newSections = [...sections]
    ;[newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]]
    onReorder(newSections)
  }

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return
    const newSections = [...sections]
    ;[newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
    onReorder(newSections)
  }

  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Section Order</h3>
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div key={section.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === sections.length - 1}
                className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <span className="flex-1 text-sm">{section.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

