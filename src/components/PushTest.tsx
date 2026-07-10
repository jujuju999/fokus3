import { useState } from 'react'
import { sendTestPush } from '../lib/push'

/**
 * Dev-only helper: fire the reminder push right now instead of waiting for
 * 07:00 / 21:30. Rendered only in `npm run dev` AND with
 * VITE_ENABLE_PUSH_TEST=true — never part of a production build.
 * The push goes to ALL subscribed devices, so a click here on the desktop
 * also makes the installed iPhone PWA ring.
 */
export default function PushTest() {
  const [result, setResult] = useState<string | null>(null)

  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_PUSH_TEST !== 'true') {
    return null
  }

  async function trigger(slot: 'morning' | 'evening') {
    setResult('Sende …')
    try {
      const { sent, subscriptions } = await sendTestPush(slot)
      setResult(`Gesendet an ${sent} von ${subscriptions} Gerät${subscriptions === 1 ? '' : 'en'}.`)
    } catch (e) {
      setResult(`Fehler: ${e instanceof Error ? e.message : 'unbekannt'}`)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-xs font-medium text-amber-700">Dev: Push sofort testen</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => trigger('morning')}
          className="flex-1 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-200"
        >
          Morgen-Push (7:00)
        </button>
        <button
          type="button"
          onClick={() => trigger('evening')}
          className="flex-1 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-200"
        >
          Abend-Push (21:30)
        </button>
      </div>
      {result && <p className="mt-2 text-xs text-amber-700">{result}</p>}
    </div>
  )
}
