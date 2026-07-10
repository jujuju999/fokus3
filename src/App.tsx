import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { useAuth } from './hooks/useAuth'
import SetupNotice from './components/SetupNotice'
import TabBar, { type Tab } from './components/TabBar'
import Home from './pages/Home'
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
    <>
      {tab === 'heute' ? <Home /> : <Week />}
      <TabBar tab={tab} onChange={onTabChange} />
    </>
  )
}
