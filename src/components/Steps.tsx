export default function Steps() {
  return (
    <section id="how" className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h3 className="text-2xl font-semibold">How it works</h3>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[{
            title: 'Import or start fresh',
            body: 'Upload your Word/PDF or start from a clean template.'
          },{
            title: 'Edit through parameters',
            body: 'Change bullets, roles, metrics, and sections via simple fields.'
          },{
            title: 'Export perfectly',
            body: 'Download ATS-friendly PDF or DOCX that never breaks.'
          }].map((s, i) => (
            <div key={i} className="rounded-2xl border p-6 shadow-soft">
              <div className="text-sm text-gray-500">Step {i+1}</div>
              <div className="mt-2 text-lg font-semibold">{s.title}</div>
              <p className="mt-2 text-gray-600">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

