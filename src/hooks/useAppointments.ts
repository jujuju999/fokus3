import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import {
  dbDeleteAppointment,
  dbInsertAppointment,
  dbUpdateAppointment,
  fetchAppointments,
  rowToAppointment,
  type Appointment,
  type AppointmentRow,
} from '../lib/appointments'

const TOAST_MS = 4000

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Mirror for optimistic-rollback snapshots without stale closures.
  const appointmentsRef = useRef<Appointment[]>([])
  appointmentsRef.current = appointments
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchAppointments()
        if (!cancelled) setAppointments(data)
      } catch {
        if (!cancelled) showToast('Termine konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showToast])

  // Realtime: keep a second open device in sync; idempotent against our own
  // optimistic updates (same ids, full-row merge).
  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          const row = payload.new as AppointmentRow
          setAppointments((prev) =>
            prev.some((a) => a.id === row.id) ? prev : [...prev, rowToAppointment(row)],
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        (payload) => {
          const row = payload.new as AppointmentRow
          setAppointments((prev) =>
            prev.map((a) => (a.id === row.id ? rowToAppointment(row) : a)),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'appointments' },
        (payload) => {
          const { id } = payload.old as Pick<AppointmentRow, 'id'>
          setAppointments((prev) => prev.filter((a) => a.id !== id))
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  /** Apply an optimistic update, run the DB op, roll back + toast on failure. */
  const mutate = useCallback(
    async (update: (prev: Appointment[]) => Appointment[], op: () => Promise<void>) => {
      const snapshot = appointmentsRef.current
      setAppointments(update(snapshot))
      try {
        await op()
      } catch {
        setAppointments(snapshot)
        showToast('Änderung fehlgeschlagen – bitte erneut versuchen.')
      }
    },
    [showToast],
  )

  const addAppointment = useCallback(
    (a: Appointment) => {
      void mutate(
        (prev) => [...prev, a],
        () => dbInsertAppointment(a),
      )
    },
    [mutate],
  )

  const updateAppointment = useCallback(
    (a: Appointment) => {
      void mutate(
        (prev) => prev.map((x) => (x.id === a.id ? a : x)),
        () => dbUpdateAppointment(a),
      )
    },
    [mutate],
  )

  const deleteAppointment = useCallback(
    (id: string) => {
      void mutate(
        (prev) => prev.filter((a) => a.id !== id),
        () => dbDeleteAppointment(id),
      )
    },
    [mutate],
  )

  return { appointments, loading, toast, addAppointment, updateAppointment, deleteAppointment }
}
