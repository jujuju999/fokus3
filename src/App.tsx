import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { useAuth } from './hooks/useAuth'
import { useAutoScheduler } from './hooks/useAutoScheduler'
import SetupNotice from './components/SetupNotice'
import SegmentedControl, { type Tab } from './components/SegmentedControl'
import Home from './pages/Home'
import InboxPage from './pages/InboxPage'
import Login from './pages/Login'
import Week from './pages/Week'

export default function App() {
  const [tab, setTab] = useState<Tab>('heute')

  if (!isSupabaseConfigured) return <SetupNotice />

  return <AuthGate tab={tab} onTabChange={setTab} />
}

// Separate component so useAuth only runs once the Supabase client exists.
function AuthGate({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />

  return (
    <div className="min-h-dvh bg-base">
      <Scheduler />
      <SegmentedControl tab={tab} onChange={onTabChange} />
      {tab === 'heute' && <Home />}
      {tab === 'woche' && <Week />}
      {tab === 'inbox' && <InboxPage />}
    </div>
  )
}

// Runs the auto-scheduler exactly once, independent of which tab is open.
function Scheduler() {
  useAutoScheduler()
  return null
}
