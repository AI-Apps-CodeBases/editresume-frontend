export default function Pricing() {
  return (
    <section id="pricing" className="py-16 border-t">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h3 className="text-2xl font-semibold">Simple pricing</h3>
        <p className="mt-2 text-gray-600">Start free. Upgrade when you need more.</p>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-6 shadow-soft">
            <div className="text-lg font-semibold">Free</div>
            <div className="text-3xl font-bold mt-2">$0</div>
            <ul className="mt-4 text-left text-gray-600 list-disc list-inside">
              <li>1 resume</li>
              <li>Unlimited edits</li>
              <li>PDF export</li>
            </ul>
            <a href="/editor" className="mt-6 inline-block rounded-2xl bg-primary px-5 py-2 text-white">Try Free</a>
          </div>
          <div className="rounded-2xl border p-6 shadow-soft">
            <div className="text-lg font-semibold">Pro (coming soon)</div>
            <div className="text-3xl font-bold mt-2">$5/mo</div>
            <ul className="mt-4 text-left text-gray-600 list-disc list-inside">
              <li>Unlimited resumes & variants</li>
              <li>DOCX export</li>
              <li>AI rewrite & templates</li>
            </ul>
            <a href="#" className="mt-6 inline-block rounded-2xl border px-5 py-2">Join Waitlist</a>
          </div>
        </div>
      </div>
    </section>
  )
}

