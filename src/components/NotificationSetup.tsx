import { useEffect, useState } from 'react'
import { isIOS, isPushSupported, isStandalone, subscribeToPush } from '../lib/push'

type PushState =
  | 'ios-needs-install' // iOS browser tab: push only works as installed PWA
  | 'unsupported'
  | 'idle' // supported, permission not asked yet
  | 'subscribing'
  | 'active'
  | 'denied'
  | 'error'

function initialState(): PushState {
  if (isIOS() && !isStandalone()) return 'ios-needs-install'
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'active'
  if (Notification.permission === 'denied') return 'denied'
  return 'idle'
}

export default function NotificationSetup() {
  const [state, setState] = useState<PushState>(initialState)

  // Permission already granted (returning visit): refresh the subscription
  // silently so the stored endpoint stays valid.
  useEffect(() => {
    if (state === 'active') {
      subscribeToPush().catch(() => setState('error'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enable() {
    setState('subscribing')
    try {
      // Must be called from a user gesture (iOS requirement).
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'idle')
        return
      }
      await subscribeToPush()
      setState('active')
    } catch {
      setState('error')
    }
  }

  switch (state) {
    case 'ios-needs-install':
      return (
        <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          Für Erinnerungen: Teilen-Menü → <span className="font-medium">„Zum Home-Bildschirm"</span>{' '}
          und Fokus3 von dort öffnen.
        </p>
      )
    case 'unsupported':
      return null
    case 'active':
      return (
        <p className="text-center text-xs text-neutral-400">
          Erinnerungen aktiv: 7:00 „Wähle deine 3" · 21:30 „Was ist offen?"
        </p>
      )
    case 'denied':
      return (
        <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
          Benachrichtigungen sind blockiert. Du kannst sie in den Browser-Einstellungen wieder
          erlauben.
        </p>
      )
    case 'error':
      return (
        <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
          Erinnerungen konnten nicht eingerichtet werden.
        </p>
      )
    default:
      return (
        <button
          type="button"
          onClick={enable}
          disabled={state === 'subscribing'}
          className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-60"
        >
          {state === 'subscribing' ? 'Wird eingerichtet …' : 'Erinnerungen aktivieren (7:00 & 21:30)'}
        </button>
      )
  }
}
