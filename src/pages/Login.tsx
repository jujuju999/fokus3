import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: 'signin' | 'signup') {
    setBusy(true)
    setError(null)
    try {
      if (action === 'signin') await signIn(email.trim(), password)
      else await signUp(email.trim(), password)
      // success: onAuthStateChange in useAuth flips the app to the main view
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'confirm-email-required') {
        setError('Konto erstellt – bitte zuerst den Bestätigungslink in deiner E-Mail öffnen, dann hier anmelden.')
      } else if (msg.includes('Invalid login credentials')) {
        setError('E-Mail oder Passwort falsch – oder noch kein Konto? Dann „Konto erstellen" nutzen.')
      } else if (msg.includes('Password should be')) {
        setError('Das Passwort muss mindestens 6 Zeichen haben.')
      } else if (msg.includes('already registered')) {
        setError('Für diese E-Mail existiert schon ein Konto – bitte anmelden.')
      } else {
        setError('Das hat nicht geklappt – bitte erneut versuchen.')
      }
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-base px-6">
      <div className="w-full max-w-md rounded-2xl border border-edge bg-card p-6">
        <h1 className="mb-1 text-[22px] font-bold text-ink">Fokus3</h1>
        <p className="mb-4 text-sm text-ink-2">Melde dich an, um deine Aufgaben zu sehen.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void run('signin')
          }}
          className="space-y-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.de"
            aria-label="E-Mail-Adresse"
            required
            autoFocus
            autoComplete="email"
            className="w-full rounded-xl border border-edge bg-base px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            aria-label="Passwort"
            required
            minLength={6}
            autoComplete="current-password"
            className="w-full rounded-xl border border-edge bg-base px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-base transition-all hover:bg-accent/90 active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? 'Bitte warten …' : 'Anmelden'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('signup')}
            className="w-full rounded-xl px-4 py-2 text-sm text-ink-2 transition-all hover:bg-edge/50 active:scale-[0.97] disabled:opacity-60"
          >
            Neues Konto erstellen
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-warn">{error}</p>}
      </div>
    </div>
  )
}
