import { useTasks } from '../hooks/useTasks'
import QuickCapture from '../components/QuickCapture'
import TodayList from '../components/TodayList'
import Inbox from '../components/Inbox'
import NotificationSetup from '../components/NotificationSetup'
import PushTest from '../components/PushTest'
import Toast from '../components/Toast'

export default function Home() {
  const {
    loading,
    toast,
    inboxTasks,
    todayOpenTasks,
    todayDoneTasks,
    usedSlots,
    canPullToToday,
    addTask,
    moveToToday,
    moveToInbox,
    completeTask,
    uncompleteTask,
    deleteTask,
  } = useTasks()

  return (
    <div className="min-h-dvh bg-neutral-50">
      <main className="mx-auto flex max-w-md flex-col gap-8 px-4 pb-16 pt-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Fokus3</h1>
        </header>

        <QuickCapture onAdd={addTask} />

        {loading ? (
          <p className="text-center text-sm text-neutral-400">Lädt …</p>
        ) : (
          <>
            <TodayList
              openTasks={todayOpenTasks}
              doneTasks={todayDoneTasks}
              usedSlots={usedSlots}
              onComplete={completeTask}
              onUncomplete={uncompleteTask}
              onMoveToInbox={moveToInbox}
            />

            <Inbox
              tasks={inboxTasks}
              canPullToToday={canPullToToday}
              onMoveToToday={moveToToday}
              onDelete={deleteTask}
            />
          </>
        )}

        <NotificationSetup />

        <PushTest />
      </main>

      <Toast message={toast} />
    </div>
  )
}
