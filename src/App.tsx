import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabaseClient'
import SetupNotice from './components/SetupNotice'
import TabBar, { type Tab } from './components/TabBar'
import Home from './pages/Home'
import Week from './pages/Week'

export default function App() {
  const [tab, setTab] = useState<Tab>('heute')

  if (!isSupabaseConfigured) return <SetupNotice />

  return (
    <>
      {tab === 'heute' ? <Home /> : <Week />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  )
}
