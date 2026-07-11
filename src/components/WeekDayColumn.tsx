import {
  formatHours,
  freeMinutes,
  minutesToTime,
  type AppointmentOccurrence,
} from '../lib/appointments'
import { effectiveWindow } from '../lib/scheduling'
import type { WakeTime } from '../lib/wakeTimes'

/** Scheduled task rendered as secondary block — display only, never tappable. */
export interface TaskBlock {
  id: string
  title: string
  startMin: number
  endMin: number
  locked: boolean
}

interface Props {
  label: string
  dateISO: string
  isToday: boolean
  /** Waking window of this weekday — the bar renders exactly this range. */
  window: WakeTime
  occurrences: AppointmentOccurrence[]
  taskBlocks: TaskBlock[]
  onTapEmpty: (startMin: number) => void
  onTapOccurrence: (occ: AppointmentOccurrence) => void
  onAdd: () => void
}

export default function WeekDayColumn({
  label,
  dateISO,
  isToday,
  window: wake,
  occurrences,
  taskBlocks,
  onTapEmpty,
  onTapOccurrence,
  onAdd,
}: Props) {
  const dayNumber = Number(dateISO.slice(8, 10))
  const win = effectiveWindow(wake) // endMin may exceed 1440 (past midnight)
  const span = win.endMin - win.startMin
  const ratio = (min: number) => ((min - win.startMin) / span) * 100

  // compact time scale: a tick every 2 hours, even hours only
  const ticks: number[] = []
  for (let t = Math.ceil(win.startMin / 120) * 120; t < win.endMin; t += 120) {
    if (t > win.startMin) ticks.push(t)
  }

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const raw = win.startMin + ((e.clientY - rect.top) / rect.height) * span
    const snapped = Math.round(raw / 30) * 30
    // appointments cannot cross 24:00 — clamp taps in the past-midnight tail
    const max = Math.min(win.endMin, 1440) - 30
    onTapEmpty(Math.min(Math.max(snapped, win.startMin), max))
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1.5">
      <div
        className={`rounded-lg py-1 text-center text-xs leading-tight ${
          isToday ? 'bg-accent font-semibold text-base' : 'text-ink-2'
        }`}
      >
        <div>{label}</div>
        <div className={isToday ? 'text-base/80' : 'text-ink-3'}>{dayNumber}</div>
      </div>

      <div className="flex gap-0.5">
        {/* time scale left of the bar — compact, not dominant */}
        <div className="relative w-3 shrink-0" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[8px] leading-none text-ink-3"
              style={{ top: `${ratio(t)}%` }}
            >
              {(t / 60) % 24}
            </span>
          ))}
        </div>

        <div
          role="button"
          aria-label={`Zeitbalken ${label} (${minutesToTime(wake.startMin)}–${minutesToTime(wake.endMin % 1440)}) – tippen für neuen Termin`}
          onClick={handleBarClick}
          className={`relative h-80 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-lg border bg-bar-free ${
            isToday ? 'border-accent' : 'border-edge'
          }`}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className="pointer-events-none absolute inset-x-0 border-t border-edge/40"
              style={{ top: `${ratio(t)}%` }}
            />
          ))}

          {occurrences.map((occ) => (
            <button
              key={occ.base.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTapOccurrence(occ)
              }}
              aria-label={`Termin „${occ.title}“, ${minutesToTime(occ.startMin)}–${minutesToTime(occ.endMin)}`}
              className="absolute inset-x-0.5 overflow-hidden rounded-md bg-bar-busy px-0.5 text-left text-[9px] leading-tight text-ink transition-colors hover:bg-edge"
              style={{
                top: `${ratio(Math.max(occ.startMin, win.startMin))}%`,
                height: `${
                  ratio(Math.min(occ.endMin, Math.min(win.endMin, 1440))) -
                  ratio(Math.max(occ.startMin, win.startMin))
                }%`,
              }}
            >
              {occ.title}
            </button>
          ))}

          {/* scheduled tasks: secondary blocks, accent, not interactive
              (editing happens on the Heute card only) */}
          {taskBlocks.map((tb) => (
            <div
              key={tb.id}
              aria-label={`Geplante Aufgabe „${tb.title}“, ${minutesToTime(tb.startMin % 1440)}–${minutesToTime(tb.endMin % 1440)}`}
              className={`pointer-events-none absolute inset-x-0.5 overflow-hidden rounded-md border border-accent px-0.5 text-left text-[9px] leading-tight text-accent ${
                tb.locked ? 'opacity-75' : 'border-dashed opacity-50'
              }`}
              style={{
                top: `${ratio(Math.max(tb.startMin, win.startMin))}%`,
                height: `${
                  ratio(Math.min(tb.endMin, win.endMin)) -
                  ratio(Math.max(tb.startMin, win.startMin))
                }%`,
              }}
            >
              {tb.title}
            </div>
          ))}
        </div>
      </div>

      {/* big free-hours metric (Space Grotesk) */}
      <p className="text-center leading-tight">
        <span className="font-metric text-sm font-bold text-ink">
          {formatHours(freeMinutes(occurrences, wake))}
        </span>
        <span className="block text-[9px] text-ink-3">frei</span>
      </p>

      {/* mobile fallback: create without hitting the bar precisely */}
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Neuer Termin am ${label}`}
        className="h-7 rounded-lg border border-edge text-sm text-ink-3 transition-all hover:text-ink-2 active:scale-[0.97]"
      >
        +
      </button>
    </div>
  )
}
