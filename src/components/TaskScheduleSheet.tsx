import { useState } from 'react'
import { formatEstimate } from '../lib/tasks'
import { minutesToTime, timeToMinutes } from '../lib/appointments'

interface Props {
  taskTitle: string
  durationMinutes: number
  /** Current slot start in minutes-of-day, or null when unscheduled. */
  initialStartMin: number | null
  hasSlot: boolean
  locked: boolean
  /** Save the picked start time AND lock the slot. */
  onFix: (startMin: number) => void
  /** Unlock — the auto-scheduler plans it again. */
  onRelease: () => void
  /** Clear the slot; task stays in Heute without a time (opted out). */
  onRemove: () => void
  onClose: () => void
}

/** Bottom sheet behind the time chip on a Heute task card. */
export default function TaskScheduleSheet({
  taskTitle,
  durationMinutes,
  initialStartMin,
  hasSlot,
  locked,
  onFix,
  onRelease,
  onRemove,
  onClose,
}: Props) {
  const [start, setStart] = useState(minutesToTime((initialStartMin ?? 540) % 1440))
  const endPreview = minutesToTime((timeToMinutes(start) + durationMinutes) % 1440)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Zeit-Slot für „${taskTitle}“`}
        className="w-full max-w-md rounded-t-2xl border-t border-edge bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-[22px] font-semibold text-ink">{taskTitle}</h2>
        <p className="mb-4 text-sm text-ink-2">
          Dauer {formatEstimate(durationMinutes)} · Ende {endPreview}
        </p>

        <label className="block text-sm text-ink-2">
          Beginn
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-edge bg-base px-3 py-3 text-[15px] text-ink"
          />
        </label>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => onFix(timeToMinutes(start))}
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-base transition-all hover:bg-accent/90 active:scale-[0.97]"
          >
            Fixieren
          </button>
          {locked && (
            <button
              type="button"
              onClick={onRelease}
              className="w-full rounded-xl border border-edge px-4 py-3 text-sm font-medium text-ink transition-all hover:border-accent/50 active:scale-[0.97]"
            >
              Freigeben – automatisch planen
            </button>
          )}
          {hasSlot && (
            <button
              type="button"
              onClick={onRemove}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium text-warn transition-all hover:bg-warn/10 active:scale-[0.97]"
            >
              Entfernen – heute ohne Zeit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2 text-sm text-ink-2 transition-all hover:bg-edge/50 active:scale-[0.97]"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
