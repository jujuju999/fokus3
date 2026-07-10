import { useState } from 'react'
import { sendLoginCode, verifyLoginCode } from '../lib/auth'

type Step = 'email' | 'code'

export default function Login() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await sendLoginCode(email.trim())
      setStep('code')
    } catch {
      setError('Code konnte nicht gesendet werden – E-Mail-Adresse prüfen und erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await verifyLoginCode(email.trim(), code.trim())
      // success: onAuthStateChange in useAuth flips the app to the main view
    } catch {
      setError('Code ungültig oder abgelaufen – bitte erneut versuchen.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-neutral-900">Fokus3</h1>

        {step === 'email' ? (
          <>
            <p className="mb-4 text-sm text-neutral-500">
              Anmelden ohne Passwort: Wir schicken dir einen Code per E-Mail.
            </p>
            <form onSubmit={handleSendCode} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                aria-label="E-Mail-Adresse"
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? 'Sende …' : 'Code senden'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-500">
              Code aus der E-Mail an <span className="font-medium">{email}</span> eingeben.
            </p>
            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-stelliger Code"
                aria-label="Login-Code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? 'Prüfe …' : 'Anmelden'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
                className="w-full rounded-xl px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100"
              >
                Andere E-Mail / neuen Code anfordern
              </button>
            </form>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
