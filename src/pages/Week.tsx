import { useState } from 'react'
import { useAppointments } from '../hooks/useAppointments'
import { useWakeTimes } from '../hooks/useWakeTimes'
import {
  WEEKDAY_LABELS,
  currentWeekDates,
  occurrencesForDay,
  todayISO,
  type Appointment,
  type AppointmentOccurrence,
} from '../lib/appointments'
import { DEFAULT_WAKE_TIMES } from '../lib/wakeTimes'
import WeekDayColumn from '../components/WeekDayColumn'
import WakeSetup from '../components/WakeSetup'
import AppointmentModal, { type ModalDraft } from '../components/AppointmentModal'
import Toast from '../components/Toast'

interface ModalState {
  isNew: boolean
  dateISO: string
  weekdayIdx: number
  /** Base appointment when editing; null for a new one. */
  base: Appointment | null
  draft: ModalDraft
}

export default function Week() {
  const {
    appointments,
    exceptions,
    loading,
    toast,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    upsertException,
  } = useAppointments()
  const wake = useWakeTimes()
  const [modal, setModal] = useState<ModalState | null>(null)
  const [editWake, setEditWake] = useState(false)

  const weekDates = currentWeekDates()
  const today = todayISO()

  if (wake.loading || loading) {
    return <p className="pt-10 text-center text-sm text-ink-3">Lädt …</p>
  }

  // First run: waking hours before anything else — they define the bars.
  if (wake.needsSetup || editWake) {
    return (
      <main className="mx-auto max-w-md px-6 pb-16 pt-6">
        <WakeSetup
          initial={wake.wakeTimes?.length ? wake.wakeTimes : DEFAULT_WAKE_TIMES}
          isFirstRun={wake.needsSetup}
          onSave={async (times) => {
            const ok = await wake.save(times)
            if (ok) setEditWake(false)
            return ok
          }}
          onCancel={wake.needsSetup ? undefined : () => setEditWake(false)}
        />
      </main>
    )
  }

  function openNew(weekdayIdx: number, startMin?: number) {
    const win = wake.windows.get(weekdayIdx)!
    const start =
      startMin ?? Math.min(Math.max(9 * 60, win.startMin), win.endMin - 60)
    setModal({
      isNew: true,
      dateISO: weekDates[weekdayIdx],
      weekdayIdx,
      base: null,
      draft: {
        title: '',
        weekdayIdx,
        startMin: start,
        endMin: Math.min(start + 60, win.endMin),
        recurring: false,
      },
    })
  }

  function openEdit(occ: AppointmentOccurrence, weekdayIdx: number) {
    setModal({
      isNew: false,
      dateISO: occ.dateISO,
      weekdayIdx,
      base: occ.base,
      draft: {
        title: occ.title,
        weekdayIdx,
        startMin: occ.startMin,
        endMin: occ.endMin,
        recurring: occ.base.recurring,
      },
    })
  }

  function handleSaveAll(d: ModalDraft) {
    if (!modal) return
    if (modal.isNew) {
      addAppointment({
        id: crypto.randomUUID(),
        title: d.title,
        recurring: d.recurring,
        weekday: d.recurring ? d.weekdayIdx : null,
        date: d.recurring ? null : weekDates[d.weekdayIdx],
        startMin: d.startMin,
        endMin: d.endMin,
        createdAt: new Date().toISOString(),
      })
    } else if (modal.base) {
      updateAppointment({
        ...modal.base,
        title: d.title,
        // one-offs may move to another weekday; series keep their day
        weekday: modal.base.recurring ? modal.base.weekday : null,
        date: modal.base.recurring ? null : weekDates[d.weekdayIdx],
        startMin: d.startMin,
        endMin: d.endMin,
      })
    }
    setModal(null)
  }

  function handleSaveWeek(d: ModalDraft) {
    if (!modal?.base) return
    upsertException({
      appointmentId: modal.base.id,
      exceptionDate: modal.dateISO,
      deleted: false,
      newTitle: d.title,
      newStartMin: d.startMin,
      newEndMin: d.endMin,
    })
    setModal(null)
  }

  function handleDeleteAll() {
    if (modal?.base) deleteAppointment(modal.base.id)
    setModal(null)
  }

  function handleDeleteWeek() {
    if (!modal?.base) return
    upsertException({
      appointmentId: modal.base.id,
      exceptionDate: modal.dateISO,
      deleted: true,
      newTitle: null,
      newStartMin: null,
      newEndMin: null,
    })
    setModal(null)
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-6 pb-16 pt-6">
      <header className="flex items-baseline justify-between px-1">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-ink">Woche</h1>
          <p className="text-sm text-ink-3">Tippen für neuen Termin</p>
        </div>
        <button
          type="button"
          onClick={() => setEditWake(true)}
          className="text-xs text-ink-3 transition-colors hover:text-ink-2"
        >
          Wachzeiten
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((dateISO, idx) => (
          <WeekDayColumn
            key={dateISO}
            label={WEEKDAY_LABELS[idx]}
            dateISO={dateISO}
            isToday={dateISO === today}
            window={wake.windows.get(idx)!}
            occurrences={occurrencesForDay(appointments, exceptions, idx, dateISO)}
            onTapEmpty={(startMin) => openNew(idx, startMin)}
            onTapOccurrence={(occ) => openEdit(occ, idx)}
            onAdd={() => openNew(idx)}
          />
        ))}
      </div>

      {modal && (
        <AppointmentModal
          draft={modal.draft}
          isNew={modal.isNew}
          isRecurringOccurrence={!modal.isNew && !!modal.base?.recurring}
          onSaveAll={handleSaveAll}
          onSaveWeek={handleSaveWeek}
          onDeleteAll={handleDeleteAll}
          onDeleteWeek={handleDeleteWeek}
          onClose={() => setModal(null)}
        />
      )}

      <Toast message={toast} />
    </main>
  )
}
