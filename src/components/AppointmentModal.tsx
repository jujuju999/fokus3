import { useState } from 'react'
import {
  DAY_START_MIN,
  DAY_END_MIN,
  WEEKDAY_LABELS,
  minutesToTime,
  timeToMinutes,
  weekdayIndex,
  type Appointment,
} from '../lib/appointments'

interface Props {
  draft: Appointment
  isNew: boolean
  /** ISO dates Mo–So of the current week, to resolve weekday -> date for one-offs. */
  weekDates: string[]
  onSave: (a: Appointment) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function draftWeekdayIndex(draft: Appointment, weekDates: string[]): number {
  if (draft.recurring && draft.weekday !== null) return draft.weekday
  if (draft.date) {
    const idx = weekDates.indexOf(draft.date)
    if (idx >= 0) return idx
    // one-off outside the current week (shouldn't happen in this view)
    return weekdayIndex(new Date(`${draft.date}T00:00:00`))
  }
  return 0
}

export default function AppointmentModal({
  draft,
  isNew,
  weekDates,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(draft.title)
  const [weekdayIdx, setWeekdayIdx] = useState(() => draftWeekdayIndex(draft, weekDates))
  const [start, setStart] = useState(minutesToTime(draft.startMin))
  const [end, setEnd] = useState(minutesToTime(Math.min(draft.endMin, DAY_END_MIN - 1)))
  const [recurring, setRecurring] = useState(draft.recurring)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const trimmed = title.trim()
    const startMin = timeToMinutes(start)
    const endMin = timeToMinutes(end)
    if (!trimmed) {
      setError('Bitte einen Titel eingeben.')
      return
    }
    if (startMin < DAY_START_MIN) {
      setError('Frühester Beginn ist 6:00 Uhr.')
      return
    }
    if (endMin <= startMin) {
      setError('Das Ende muss nach dem Beginn liegen.')
      return
    }
    onSave({
      ...draft,
      title: trimmed,
      recurring,
      // recurring: tied to the weekday; one-off: resolved to this week's date
      weekday: recurring ? weekdayIdx : null,
      date: recurring ? null : weekDates[weekdayIdx],
      startMin,
      endMin,
    })
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={isNew ? 'Neuer Termin' : 'Termin bearbeiten'}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
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
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />

          <div className="flex gap-3">
            <label className="flex-1 text-sm text-neutral-600">
              Wochentag
              <select
                value={weekdayIdx}
                onChange={(e) => setWeekdayIdx(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900"
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-sm text-neutral-600">
              Von
              <input
                type="time"
                value={start}
                min={minutesToTime(DAY_START_MIN)}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900"
              />
            </label>
            <label className="flex-1 text-sm text-neutral-600">
              Bis
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-5 w-5 accent-indigo-600"
            />
            wöchentlich wiederholen
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Speichern
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => onDelete(draft.id)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Löschen
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-3 text-sm text-neutral-500 transition-colors hover:bg-neutral-100"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
