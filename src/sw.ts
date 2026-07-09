/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    payload = (event.data?.json() as PushPayload) ?? {}
  } catch {
    // non-JSON push (e.g. DevTools test push) — fall back to defaults
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Fokus3', {
      body: payload.body ?? '',
      // relative to the SW scope, so it resolves under /fokus3/ in production too
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const scoped = clients.find((c) => c.url.startsWith(self.registration.scope))
      if (scoped) return scoped.focus()
      return self.clients.openWindow(self.registration.scope)
    }),
  )
})
