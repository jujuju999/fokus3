import { getSupabase } from './supabaseClient'

/** Web push needs the VAPID public key as a Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent)
}

/** iOS only allows web push for PWAs launched from the home screen. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Subscribe this device and persist the subscription. Safe to call again for
 * an already-subscribed device (subscribe returns the existing subscription,
 * the upsert on endpoint is idempotent).
 */
export async function subscribeToPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })
  const { keys } = subscription.toJSON()
  if (!keys?.p256dh || !keys.auth) throw new Error('Push-Subscription ohne Schlüssel')

  const { error } = await getSupabase()
    .from('push_subscriptions')
    .upsert(
      { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    )
  if (error) throw new Error(error.message)
}
