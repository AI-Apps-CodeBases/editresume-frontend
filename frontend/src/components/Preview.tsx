'use client'
import { useState } from 'react'

import config from '@/lib/config';
export default function Preview() {
  const [name, setName] = useState('Hasan Tutac')
  const [title, setTitle] = useState('DevOps / SRE Engineer')
  const [bullets, setBullets] = useState(['Automated EKS with Terragrunt', 'Reduced AWS cost 23%'])

  const previewText = `${name} — ${title}\n\nExperience\n• ${bullets.join('\n• ')}`

  const callPreview = async () => {
    const res = await fetch(`${config.apiBase}/api/resume/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        title,
        sections: [ { title: 'Experience', bullets: bullets.map(b => ({ text: b })) } ]
      })
    })
    const data = await res.json()
    alert('Backend preview says:\n\n' + data.preview_text)
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-8 items-start">
        <div className="rounded-2xl border p-6 shadow-soft">
          <h3 className="text-lg font-semibold">Try a quick edit</h3>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">Name
              <input className="mt-1 w-full rounded-xl border p-2" value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label className="text-sm">Title
              <input className="mt-1 w-full rounded-xl border p-2" value={title} onChange={e => setTitle(e.target.value)} />
            </label>
            <label className="text-sm">Bullets (comma separated)
              <input className="mt-1 w-full rounded-xl border p-2" value={bullets.join(', ')} onChange={e => setBullets(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </label>
            <div className="flex gap-3 mt-2">
              <button onClick={callPreview} className="rounded-2xl bg-primary px-4 py-2 text-white font-medium">Preview via API</button>
              <button onClick={() => navigator.clipboard.writeText(previewText)} className="rounded-2xl border px-4 py-2 font-medium">Copy local preview</button>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-6 shadow-soft">
          <div className="text-sm text-gray-500">Live preview</div>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded-xl">{previewText}</pre>
        </div>
      </div>
    </section>
  )
}

