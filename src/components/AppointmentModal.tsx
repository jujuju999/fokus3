import { useState } from 'react'
import { WEEKDAY_LABELS, minutesToTime, timeToMinutes } from '../lib/appointments'

export interface ModalDraft {
  title: string
  weekdayIdx: number
  startMin: number
  endMin: number
  recurring: boolean
}

interface Props {
  draft: ModalDraft
  isNew: boolean
  /** Editing one occurrence of an existing weekly appointment. */
  isRecurringOccurrence: boolean
  onSaveAll: (d: ModalDraft) => void
  /** "Nur diese Woche": writes an exception instead of touching the series. */
  onSaveWeek: (d: ModalDraft) => void
  onDeleteAll: () => void
  onDeleteWeek: () => void
  onClose: () => void
}

export default function AppointmentModal({
  draft,
  isNew,
  isRecurringOccurrence,
  onSaveAll,
  onSaveWeek,
  onDeleteAll,
  onDeleteWeek,
  onClose,
}: Props) {
  const [title, setTitle] = useState(draft.title)
  const [weekdayIdx, setWeekdayIdx] = useState(draft.weekdayIdx)
  const [start, setStart] = useState(minutesToTime(draft.startMin))
  const [end, setEnd] = useState(minutesToTime(Math.min(draft.endMin, 1439)))
  const [recurring, setRecurring] = useState(draft.recurring)
  const [error, setError] = useState<string | null>(null)
  // Recurring appointments ask for scope before saving/deleting.
  const [scopeAsk, setScopeAsk] = useState<'save' | 'delete' | null>(null)

  function buildDraft(): ModalDraft | null {
    const trimmed = title.trim()
    const startMin = timeToMinutes(start)
    const endMin = timeToMinutes(end)
    if (!trimmed) {
      setError('Bitte einen Titel eingeben.')
      return null
    }
    if (endMin <= startMin) {
      setError('Das Ende muss nach dem Beginn liegen.')
      return null
    }
    return { title: trimmed, weekdayIdx, startMin, endMin, recurring }
  }

  function handleSave() {
    const d = buildDraft()
    if (!d) return
    if (isRecurringOccurrence) setScopeAsk('save')
    else onSaveAll(d)
  }

  function handleScope(scope: 'week' | 'all') {
    if (scopeAsk === 'delete') {
      if (scope === 'week') onDeleteWeek()
      else onDeleteAll()
      return
    }
    const d = buildDraft()
    if (!d) return
    if (scope === 'week') onSaveWeek(d)
    else onSaveAll(d)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-label={isNew ? 'Neuer Termin' : 'Termin bearbeiten'}
        className="w-full max-w-md rounded-t-2xl border-t border-edge bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {scopeAsk ? (
          <>
            <h2 className="mb-1 text-[22px] font-semibold text-ink">
              {scopeAsk === 'delete' ? 'Serientermin löschen' : 'Serientermin ändern'}
            </h2>
            <p className="mb-4 text-sm text-ink-2">Wofür soll das gelten?</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleScope('week')}
                className="w-full rounded-xl border border-edge bg-base px-4 py-3 text-sm font-medium text-ink transition-all hover:border-accent/50 active:scale-[0.97]"
              >
                Nur diese Woche
              </button>
              <button
                type="button"
                onClick={() => handleScope('all')}
                className="w-full rounded-xl border border-edge bg-base px-4 py-3 text-sm font-medium text-ink transition-all hover:border-accent/50 active:scale-[0.97]"
              >
                Alle zukünftigen
              </button>
              <button
                type="button"
                onClick={() => setScopeAsk(null)}
                className="w-full rounded-xl px-4 py-2 text-sm text-ink-2 transition-all hover:bg-edge/50 active:scale-[0.97]"
              >
                Zurück
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-[22px] font-semibold text-ink">
              {isNew ? 'Neuer Termin' : 'Termin bearbeiten'}
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel"
                aria-label="Titel"
                autoFocus={isNew}
                className="w-full rounded-xl border border-edge bg-base px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent/60"
              />

              <div className="flex gap-3">
                <label className="flex-1 text-sm text-ink-2">
                  Wochentag
                  <select
                    value={weekdayIdx}
                    onChange={(e) => setWeekdayIdx(Number(e.target.value))}
                    disabled={isRecurringOccurrence}
                    className="mt-1 w-full rounded-xl border border-edge bg-base px-3 py-3 text-[15px] text-ink disabled:opacity-50"
                  >
                    {WEEKDAY_LABELS.map((label, i) => (
                      <option key={label} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 text-sm text-ink-2">
                  Von
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-edge bg-base px-3 py-3 text-[15px] text-ink"
                  />
                </label>
                <label className="flex-1 text-sm text-ink-2">
                  Bis
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-edge bg-base px-3 py-3 text-[15px] text-ink"
                  />
                </label>
              </div>

              {isRecurringOccurrence ? (
                <p className="text-sm text-ink-3">Serientermin – wiederholt sich wöchentlich.</p>
              ) : (
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="h-5 w-5 accent-[#ff6a3d]"
                  />
                  wöchentlich wiederholen
                </label>
              )}

              {error && <p className="text-sm text-warn">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-base transition-all hover:bg-accent/90 active:scale-[0.97]"
                >
                  Speichern
                </button>
                {!isNew && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecurringOccurrence) setScopeAsk('delete')
                      else onDeleteAll()
                    }}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-warn transition-all hover:bg-warn/10 active:scale-[0.97]"
                  >
                    Löschen
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-3 text-sm text-ink-2 transition-all hover:bg-edge/50 active:scale-[0.97]"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
