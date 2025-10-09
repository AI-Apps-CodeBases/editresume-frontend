'use client'

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            Edit your resume like code — <span className="text-primary">structured</span>, clean, exportable.
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Stop fighting Word formatting. Create, version, and export your resume in seconds — as a perfect PDF or DOCX that never breaks.
          </p>
          <div className="mt-8 flex gap-3">
            <a href="/templates" className="rounded-2xl bg-primary px-6 py-3 text-white font-medium shadow-soft hover:bg-primary-dark transition">Choose Template</a>
            <a href="/editor" className="rounded-2xl border px-6 py-3 font-medium">Start Editing</a>
          </div>
          <p className="mt-3 text-sm text-gray-500">No signup required • Export instantly</p>
        </div>
        <div className="rounded-2xl border shadow-soft p-4">
          <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 grid place-items-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">Live Preview (mock)</div>
              <div className="font-mono text-xs bg-white border rounded p-3">
                {`{ name: "Hasan Tutac", title: "DevOps Engineer", bullets: ["Reduced AWS cost 23%", "Automated EKS with Terragrunt"] }`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

