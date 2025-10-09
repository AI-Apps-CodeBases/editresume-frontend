export default function Features() {
  const list = [
    { title: 'Structured editing', body: 'Edit bullets, titles, and sections using simple forms — no Word headaches.' },
    { title: 'Instant exports', body: 'Generate ATS-friendly PDF or DOCX in one click.' },
    { title: 'AI bullet suggestions (soon)', body: 'Rewrite or improve bullet points automatically.' },
    { title: 'Version control', body: 'Save multiple role-specific variants and switch instantly.' },
    { title: 'Smart templates', body: 'Developer, Designer, and General templates built for clarity.' },
    { title: 'JSON Resume-compatible', body: 'Built on the open schema — portable and API-friendly.' },
  ]
  return (
    <section className="py-16 border-t">
      <div className="mx-auto max-w-6xl px-6">
        <h3 className="text-2xl font-semibold">Key features</h3>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {list.map((f, idx) => (
            <div key={idx} className="rounded-2xl border p-6 shadow-soft">
              <div className="text-lg font-semibold">{f.title}</div>
              <p className="mt-2 text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

