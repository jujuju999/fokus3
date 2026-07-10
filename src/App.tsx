import { isSupabaseConfigured } from './lib/supabaseClient'
import SetupNotice from './components/SetupNotice'
import Home from './pages/Home'

export default function App() {
  return isSupabaseConfigured ? <Home /> : <SetupNotice />
}
