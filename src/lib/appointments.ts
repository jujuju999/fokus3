import { getSupabase } from './supabaseClient'
import { todayISO } from './tasks'
import type { WakeTime } from './wakeTimes'

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

export interface Appointment {
  id: string
  title: string
  /** true: repeats every week on `weekday` until deleted (no end date). */
  recurring: boolean
  /** 0 = Monday … 6 = Sunday; only set when recurring. */
  weekday: number | null
  /** ISO date (yyyy-mm-dd); only set for one-off appointments. */
  date: string | null
  /** Minutes since midnight. */
  startMin: number
  endMin: number
  createdAt: string
}

/** "Nur diese Woche" edit/delete of a recurring appointment. */
export interface AppointmentException {
  id: string
  appointmentId: string
  exceptionDate: string
  deleted: boolean
  newTitle: string | null
  newStartMin: number | null
  newEndMin: number | null
}

/** One rendered block in a day column: base appointment + applied exception. */
export interface AppointmentOccurrence {
  base: Appointment
  dateISO: string
  title: string
  startMin: number
  endMin: number
  isException: boolean
}

export interface AppointmentRow {
  id: string
  title: string
  recurring: boolean
  weekday: number | null
  date: string | null
  start_min: number
  end_min: number
  created_at: string
}

export interface AppointmentExceptionRow {
  id: string
  appointment_id: string
  exception_date: string
  deleted: boolean
  new_title: string | null
  new_start_min: number | null
  new_end_min: number | null
}

export function rowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    title: row.title,
    recurring: row.recurring,
    weekday: row.weekday,
    date: row.date,
    startMin: row.start_min,
    endMin: row.end_min,
    createdAt: row.created_at,
  }
}

export function rowToException(row: AppointmentExceptionRow): AppointmentException {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    exceptionDate: row.exception_date,
    deleted: row.deleted,
    newTitle: row.new_title,
    newStartMin: row.new_start_min,
    newEndMin: row.new_end_min,
  }
}

/** Monday-based weekday index (0 = Mo) for a local Date. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** ISO dates of the current week, Monday to Sunday (local time). */
export function currentWeekDates(): string[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - weekdayIndex(now))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toISODate(d)
  })
}

/**
 * Blocks visible in one day column: weekly appointments for the weekday
 * (with their "nur diese Woche" exception applied, which may also hide
 * them) plus one-offs on that date.
 */
export function occurrencesForDay(
  appointments: Appointment[],
  exceptions: AppointmentException[],
  weekdayIdx: number,
  dateISO: string,
): AppointmentOccurrence[] {
  const result: AppointmentOccurrence[] = []
  for (const a of appointments) {
    if (a.recurring ? a.weekday !== weekdayIdx : a.date !== dateISO) continue
    const ex = a.recurring
      ? exceptions.find((e) => e.appointmentId === a.id && e.exceptionDate === dateISO)
      : undefined
    if (ex?.deleted) continue
    result.push({
      base: a,
      dateISO,
      title: ex?.newTitle ?? a.title,
      startMin: ex?.newStartMin ?? a.startMin,
      endMin: ex?.newEndMin ?? a.endMin,
      isException: !!ex,
    })
  }
  return result.sort((a, b) => a.startMin - b.startMin)
}

/**
 * Free minutes inside the day's waking window: window length minus the
 * merged (overlap-free) appointment time, clamped to the window.
 */
export function freeMinutes(
  occurrences: Array<{ startMin: number; endMin: number }>,
  window: Pick<WakeTime, 'startMin' | 'endMin'>,
): number {
  const sorted = occurrences
    .map((o) => ({
      start: Math.max(o.startMin, window.startMin),
      end: Math.min(o.endMin, window.endMin),
    }))
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start)

  let busy = 0
  let currentEnd = -1
  for (const iv of sorted) {
    if (iv.start >= currentEnd) {
      busy += iv.end - iv.start
      currentEnd = iv.end
    } else if (iv.end > currentEnd) {
      busy += iv.end - currentEnd
      currentEnd = iv.end
    }
  }
  return window.endMin - window.startMin - busy
}

/** "4h" / "3,5h" — German decimal comma, halves only. */
export function formatHours(minutes: number): string {
  const halves = Math.round(minutes / 30) / 2
  return `${halves.toLocaleString('de-DE')}h`
}

export function minutesToTime(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export { todayISO }

// --- Queries (all data access goes through here, per CLAUDE.md) ---

export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as AppointmentRow[]).map(rowToAppointment)
}

export async function fetchExceptions(): Promise<AppointmentException[]> {
  const { data, error } = await getSupabase().from('appointment_exceptions').select('*')
  if (error) throw new Error(error.message)
  return (data as AppointmentExceptionRow[]).map(rowToException)
}

export async function dbInsertAppointment(a: Appointment): Promise<void> {
  const { error } = await getSupabase().from('appointments').insert({
    id: a.id,
    title: a.title,
    recurring: a.recurring,
    weekday: a.weekday,
    date: a.date,
    start_min: a.startMin,
    end_min: a.endMin,
    created_at: a.createdAt,
  })
  if (error) throw new Error(error.message)
}

export async function dbUpdateAppointment(a: Appointment): Promise<void> {
  const { error } = await getSupabase()
    .from('appointments')
    .update({
      title: a.title,
      recurring: a.recurring,
      weekday: a.weekday,
      date: a.date,
      start_min: a.startMin,
      end_min: a.endMin,
    })
    .eq('id', a.id)
  if (error) throw new Error(error.message)
}

export async function dbDeleteAppointment(id: string): Promise<void> {
  const { error } = await getSupabase().from('appointments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Upsert keyed on (appointment_id, exception_date) — one exception per week. */
export async function dbUpsertException(
  ex: Omit<AppointmentException, 'id'>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('appointment_exceptions')
    .upsert(
      {
        appointment_id: ex.appointmentId,
        exception_date: ex.exceptionDate,
        deleted: ex.deleted,
        new_title: ex.newTitle,
        new_start_min: ex.newStartMin,
        new_end_min: ex.newEndMin,
      },
      { onConflict: 'appointment_id,exception_date' },
    )
  if (error) throw new Error(error.message)
}
