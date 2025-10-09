'use client'
import { useState } from 'react'

interface Props {
  replacements: Record<string, string>
  onChange: (replacements: Record<string, string>) => void
}

export default function GlobalReplacements({ replacements, onChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const addReplacement = () => {
    if (newKey && newValue) {
      onChange({ ...replacements, [newKey]: newValue })
      setNewKey('')
      setNewValue('')
    }
  }

  const removeReplacement = (key: string) => {
    const updated = { ...replacements }
    delete updated[key]
    onChange(updated)
  }

  return (
    <div className="bg-white rounded-2xl border p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Global Replacements</h3>
          <p className="text-sm text-gray-600">Define variables to reuse across your resume</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Variable (e.g. {{company}})"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="px-3 py-2 border rounded-xl text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Replacement text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-xl text-sm"
              />
              <button
                onClick={addReplacement}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-dark"
              >
                Add
              </button>
            </div>
          </div>

          {Object.entries(replacements).length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {Object.entries(replacements).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-3 text-sm">
                    <code className="font-mono text-primary">{key}</code>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-700">{value}</span>
                  </div>
                  <button
                    onClick={() => removeReplacement(key)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

