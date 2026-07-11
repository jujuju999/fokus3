import { useState } from 'react'

interface Props {
  onAdd: (title: string, estimatedMinutes: number | null) => void
}

const ESTIMATE_OPTIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 120, label: '2 h' },
  { minutes: 240, label: '4 h' },
]

export default function QuickCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState<number | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd(title, estimate)
    setTitle('')
    setEstimate(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Was hast du im Kopf?"
        aria-label="Neue Aufgabe erfassen"
        autoFocus
        enterKeyHint="done"
        className="w-full rounded-2xl border border-edge bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent/60"
      />
      {/* optional duration for the capacity check — tap again to deselect */}
      <div className="flex gap-1.5" role="group" aria-label="Geschätzte Dauer (optional)">
        {ESTIMATE_OPTIONS.map(({ minutes, label }) => (
          <button
            key={minutes}
            type="button"
            onClick={() => setEstimate((cur) => (cur === minutes ? null : minutes))}
            aria-pressed={estimate === minutes}
            className={`flex-1 rounded-lg border py-1.5 text-xs transition-all active:scale-[0.97] ${
              estimate === minutes
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-edge text-ink-3 hover:text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </form>
  )
}
