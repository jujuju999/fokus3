import { useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import {
  DAY_END_MIN,
  WEEKDAY_LABELS,
  appointmentsForDay,
  currentWeekDates,
  todayISO,
  type Appointment,
} from '../lib/appointments'
import WeekDayColumn from '../components/WeekDayColumn'
import AppointmentModal from '../components/AppointmentModal'
import Toast from '../components/Toast'

interface ModalState {
  draft: Appointment
  isNew: boolean
}

export default function Week() {
  const { appointments, loading, toast, addAppointment, updateAppointment, deleteAppointment } =
    useAppointments()
  const [modal, setModal] = useState<ModalState | null>(null)

  const weekDates = currentWeekDates()
  const today = todayISO()

  function openNew(weekdayIdx: number, startMin: number) {
    setModal({
      isNew: true,
      draft: {
        id: crypto.randomUUID(),
        title: '',
        recurring: false,
        weekday: null,
        date: weekDates[weekdayIdx],
        startMin,
        endMin: Math.min(startMin + 60, DAY_END_MIN),
        createdAt: new Date().toISOString(),
      },
    })
  }

  function handleSave(a: Appointment) {
    if (modal?.isNew) addAppointment(a)
    else updateAppointment(a)
    setModal(null)
  }

  function handleDelete(id: string) {
    deleteAppointment(id)
    setModal(null)
  }

  return (
    <div className="min-h-dvh bg-neutral-50">
      <main className="mx-auto flex max-w-md flex-col gap-4 px-3 pb-24 pt-8">
        <header className="px-1">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Woche</h1>
          <p className="text-sm text-neutral-400">6:00 – 24:00 · Tippen für neuen Termin</p>
        </header>

        {loading ? (
          <p className="text-center text-sm text-neutral-400">Lädt …</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((dateISO, idx) => (
              <WeekDayColumn
                key={dateISO}
                label={WEEKDAY_LABELS[idx]}
                dateISO={dateISO}
                isToday={dateISO === today}
                appointments={appointmentsForDay(appointments, idx, dateISO)}
                onTapEmpty={(startMin) => openNew(idx, startMin)}
                onTapAppointment={(a) => setModal({ draft: a, isNew: false })}
              />
            ))}
          </div>
        )}
      </main>

      {modal && (
        <AppointmentModal
          draft={modal.draft}
          isNew={modal.isNew}
          weekDates={weekDates}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
