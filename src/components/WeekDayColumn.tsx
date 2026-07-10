import {
  DAY_SPAN_MIN,
  DAY_START_MIN,
  DAY_END_MIN,
  formatHours,
  freeMinutes,
  minutesToTime,
  type Appointment,
} from '../lib/appointments'

interface Props {
  label: string
  dateISO: string
  isToday: boolean
  appointments: Appointment[]
  onTapEmpty: (startMin: number) => void
  onTapAppointment: (a: Appointment) => void
}

export default function WeekDayColumn({
  label,
  dateISO,
  isToday,
  appointments,
  onTapEmpty,
  onTapAppointment,
}: Props) {
  const dayNumber = Number(dateISO.slice(8, 10))

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height
    // snap to 30-minute steps, keep at least 30 min room before 24:00
    const raw = DAY_START_MIN + ratio * DAY_SPAN_MIN
    const snapped = Math.round(raw / 30) * 30
    onTapEmpty(Math.min(Math.max(snapped, DAY_START_MIN), DAY_END_MIN - 30))
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1">
      <div
        className={`rounded-lg py-1 text-center text-xs leading-tight ${
          isToday ? 'bg-indigo-600 font-semibold text-white' : 'text-neutral-500'
        }`}
      >
        <div>{label}</div>
        <div className={isToday ? 'text-indigo-100' : 'text-neutral-400'}>{dayNumber}</div>
      </div>

      <div
        role="button"
        aria-label={`Zeitbalken ${label} – tippen für neuen Termin`}
        onClick={handleBarClick}
        className={`relative h-80 cursor-pointer overflow-hidden rounded-lg border bg-white ${
          isToday ? 'border-indigo-300' : 'border-neutral-200'
        }`}
      >
        {/* subtle guides at 12:00 and 18:00 for orientation */}
        {[720, 1080].map((min) => (
          <div
            key={min}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-neutral-100"
            style={{ top: `${((min - DAY_START_MIN) / DAY_SPAN_MIN) * 100}%` }}
          />
        ))}

        {appointments.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onTapAppointment(a)
            }}
            aria-label={`Termin „${a.title}“, ${minutesToTime(a.startMin)}–${minutesToTime(a.endMin)}`}
            className="absolute inset-x-0.5 overflow-hidden rounded-md bg-indigo-200/90 px-0.5 text-left text-[9px] leading-tight text-indigo-900 transition-colors hover:bg-indigo-300"
            style={{
              top: `${((a.startMin - DAY_START_MIN) / DAY_SPAN_MIN) * 100}%`,
              height: `${((a.endMin - a.startMin) / DAY_SPAN_MIN) * 100}%`,
            }}
          >
            {a.title}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] tabular-nums text-neutral-500">
        {formatHours(freeMinutes(appointments))} frei
      </p>
    </div>
  )
}
