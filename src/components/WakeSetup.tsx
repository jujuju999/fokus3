import { useState } from 'react'
import { WEEKDAY_LABELS, minutesToTime, timeToMinutes } from '../lib/appointments'
import type { WakeTime } from '../lib/wakeTimes'

interface Props {
  initial: WakeTime[]
  /** Shown on first run; the same form doubles as the settings editor. */
  isFirstRun: boolean
  onSave: (times: WakeTime[]) => Promise<boolean>
  onCancel?: () => void
}

/** 7 rows Mo–So with start/end time — defines the visible bar per weekday. */
export default function WakeSetup({ initial, isFirstRun, onSave, onCancel }: Props) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: 7 }, (_, weekday) => {
      const w = initial.find((t) => t.weekday === weekday)
      return {
        start: minutesToTime(w?.startMin ?? 7 * 60),
        end: minutesToTime(w?.endMin ?? 23 * 60),
      }
    }),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(idx: number, field: 'start' | 'end', value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  async function handleSave() {
    const times: WakeTime[] = rows.map((r, weekday) => ({
      weekday,
      startMin: timeToMinutes(r.start),
      endMin: timeToMinutes(r.end),
    }))
    const invalid = times.find((t) => t.endMin <= t.startMin)
    if (invalid) {
      setError(
        `${WEEKDAY_LABELS[invalid.weekday]}: Ende muss nach dem Beginn liegen (gleicher Tag).`,
      )
      return
    }
    setBusy(true)
    setError(null)
    const ok = await onSave(times)
    setBusy(false)
    if (!ok) setError('Speichern fehlgeschlagen – bitte erneut versuchen.')
  }

  return (
    <div className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-1 text-[22px] font-semibold text-ink">
        {isFirstRun ? 'Deine Wachzeiten' : 'Wachzeiten'}
      </h2>
      <p className="mb-4 text-sm text-ink-2">
        Der Wochenbalken zeigt nur diese Zeit – daraus entsteht „frei" pro Tag.
      </p>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={WEEKDAY_LABELS[idx]} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-sm font-medium text-ink-2">
              {WEEKDAY_LABELS[idx]}
            </span>
            <input
              type="time"
              value={row.start}
              onChange={(e) => update(idx, 'start', e.target.value)}
              aria-label={`${WEEKDAY_LABELS[idx]} wach ab`}
              className="flex-1 rounded-xl border border-edge bg-base px-3 py-2 text-sm text-ink"
            />
            <span className="text-ink-3">–</span>
            <input
              type="time"
              value={row.end}
              onChange={(e) => update(idx, 'end', e.target.value)}
              aria-label={`${WEEKDAY_LABELS[idx]} wach bis`}
              className="flex-1 rounded-xl border border-edge bg-base px-3 py-2 text-sm text-ink"
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-warn">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-base transition-all hover:bg-accent/90 active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? 'Speichere …' : 'Speichern'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-3 text-sm text-ink-2 transition-all hover:bg-edge/50 active:scale-[0.97]"
          >
            Abbrechen
          </button>
        )}
      </div>
    </div>
  )
}
