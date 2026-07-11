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
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          Für Erinnerungen: Teilen-Menü → <span className="font-medium">„Zum Home-Bildschirm"</span>{' '}
          und Fokus3 von dort öffnen.
        </p>
      )
    case 'unsupported':
      return null
    case 'active':
      return (
        <p className="text-center text-xs text-ink-3">
          Erinnerungen aktiv: 7:00 „Wähle deine 3" · 21:30 „Was ist offen?"
        </p>
      )
    case 'denied':
      return (
        <p className="rounded-2xl border border-edge bg-card px-4 py-3 text-sm text-ink-2">
          Benachrichtigungen sind blockiert. Du kannst sie in den Browser-Einstellungen wieder
          erlauben.
        </p>
      )
    case 'error':
      return (
        <p className="rounded-2xl border border-edge bg-card px-4 py-3 text-sm text-ink-2">
          Erinnerungen konnten nicht eingerichtet werden.
        </p>
      )
    default:
      return (
        <button
          type="button"
          onClick={enable}
          disabled={state === 'subscribing'}
          className="w-full rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent transition-all hover:bg-accent/20 active:scale-[0.97] disabled:opacity-60"
        >
          {state === 'subscribing' ? 'Wird eingerichtet …' : 'Erinnerungen aktivieren (7:00 & 21:30)'}
        </button>
      )
  }
}
