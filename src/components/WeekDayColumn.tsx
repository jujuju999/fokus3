import {
  formatHours,
  freeMinutes,
  minutesToTime,
  type AppointmentOccurrence,
} from '../lib/appointments'
import type { WakeTime } from '../lib/wakeTimes'

interface Props {
  label: string
  dateISO: string
  isToday: boolean
  /** Waking window of this weekday — the bar renders exactly this range. */
  window: WakeTime
  occurrences: AppointmentOccurrence[]
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
  onTapEmpty,
  onTapOccurrence,
  onAdd,
}: Props) {
  const dayNumber = Number(dateISO.slice(8, 10))
  const span = wake.endMin - wake.startMin
  const ratio = (min: number) => ((min - wake.startMin) / span) * 100

  // compact time scale: a tick every 2 hours, even hours only
  const ticks: number[] = []
  for (let t = Math.ceil(wake.startMin / 120) * 120; t < wake.endMin; t += 120) {
    if (t > wake.startMin) ticks.push(t)
  }

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const raw = wake.startMin + ((e.clientY - rect.top) / rect.height) * span
    const snapped = Math.round(raw / 30) * 30
    onTapEmpty(Math.min(Math.max(snapped, wake.startMin), wake.endMin - 30))
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
              {t / 60}
            </span>
          ))}
        </div>

        <div
          role="button"
          aria-label={`Zeitbalken ${label} (${minutesToTime(wake.startMin)}–${minutesToTime(wake.endMin)}) – tippen für neuen Termin`}
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
                top: `${ratio(Math.max(occ.startMin, wake.startMin))}%`,
                height: `${
                  ratio(Math.min(occ.endMin, wake.endMin)) -
                  ratio(Math.max(occ.startMin, wake.startMin))
                }%`,
              }}
            >
              {occ.title}
            </button>
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
