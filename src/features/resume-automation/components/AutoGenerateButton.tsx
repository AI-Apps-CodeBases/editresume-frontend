"use client"

interface AutoGenerateButtonProps {
  onClick: () => void
  label?: string
}

export function AutoGenerateButton({
  onClick,
  label = '🎯 Generate Resume from Job',
}: AutoGenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:translate-y-[-1px] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <span className="text-lg">✨</span>
      {label}
    </button>
  )
}




