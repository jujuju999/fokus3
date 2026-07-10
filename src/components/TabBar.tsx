export type Tab = 'heute' | 'woche'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Woche' },
]

export default function TabBar({ tab, onChange }: Props) {
  return (
    <nav
      aria-label="Bereiche"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex-1 py-3 text-sm transition-colors ${
              tab === id ? 'font-semibold text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
