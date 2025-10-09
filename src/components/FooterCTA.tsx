export default function FooterCTA() {
  return (
    <footer className="py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h3 className="text-3xl font-semibold">Ready to fix your resume forever?</h3>
        <p className="mt-2 text-gray-600">Edit, version, and export — no Word required.</p>
        <a href="/editor" className="mt-6 inline-block rounded-2xl bg-primary px-6 py-3 text-white font-medium">Start Free</a>
        <p className="mt-6 text-xs text-gray-500">© {new Date().getFullYear()} editresume.io</p>
      </div>
    </footer>
  )
}

