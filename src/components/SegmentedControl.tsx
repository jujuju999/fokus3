export type Tab = 'heute' | 'woche' | 'inbox'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Woche' },
  { id: 'inbox', label: 'Inbox' },
]

/** Top segmented control — the one navigation element (spec: oben, Akzent für aktiv). */
export default function SegmentedControl({ tab, onChange }: Props) {
  return (
    // safe-area padding: with black-translucent the app renders under the
    // iOS status bar — without this, clock/battery overlap the control
    <nav
      aria-label="Bereiche"
      className="mx-auto w-full max-w-md px-6 pt-[calc(1rem+env(safe-area-inset-top))]"
    >
      <div className="flex rounded-xl border border-edge bg-card p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all active:scale-[0.97] ${
              tab === id ? 'bg-accent text-base' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
