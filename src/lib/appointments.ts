import { getSupabase } from './supabaseClient'
import { todayISO } from './tasks'

// Visible time scale of the week view: 06:00–24:00.
export const DAY_START_MIN = 360
export const DAY_END_MIN = 1440
export const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN // 1080

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
  /** Minutes since midnight, within [DAY_START_MIN, DAY_END_MIN]. */
  startMin: number
  endMin: number
  createdAt: string
}

/** Row shape of public.appointments (see 0003_appointments.sql). */
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

function appointmentToRow(a: Appointment): AppointmentRow {
  return {
    id: a.id,
    title: a.title,
    recurring: a.recurring,
    weekday: a.weekday,
    date: a.date,
    start_min: a.startMin,
    end_min: a.endMin,
    created_at: a.createdAt,
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

/** Appointments visible in one day column: weekly ones for the weekday plus one-offs on that date. */
export function appointmentsForDay(
  appointments: Appointment[],
  weekdayIdx: number,
  dateISO: string,
): Appointment[] {
  return appointments
    .filter((a) => (a.recurring ? a.weekday === weekdayIdx : a.date === dateISO))
    .sort((a, b) => a.startMin - b.startMin)
}

/**
 * Free minutes on the 18h scale. Overlapping appointments are merged first so
 * double-booked time is not subtracted twice.
 */
export function freeMinutes(dayAppointments: Appointment[]): number {
  const sorted = dayAppointments
    .map((a) => ({
      start: Math.max(a.startMin, DAY_START_MIN),
      end: Math.min(a.endMin, DAY_END_MIN),
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
  return DAY_SPAN_MIN - busy
}

/** "10,5 h" — German decimal comma, halves only. */
export function formatHours(minutes: number): string {
  const halves = Math.round(minutes / 30) / 2
  return `${halves.toLocaleString('de-DE')} h`
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

export async function dbInsertAppointment(a: Appointment): Promise<void> {
  const { error } = await getSupabase().from('appointments').insert(appointmentToRow(a))
  if (error) throw new Error(error.message)
}

export async function dbUpdateAppointment(a: Appointment): Promise<void> {
  const { id, ...row } = appointmentToRow(a)
  const { error } = await getSupabase().from('appointments').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function dbDeleteAppointment(id: string): Promise<void> {
  const { error } = await getSupabase().from('appointments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
