import { useCallback, useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// The browser can fire "beforeinstallprompt" very early, before any component is listening.
// So we catch it here, as soon as the app loads, and keep it until it is used.
let deferred: InstallPromptEvent | null = null
const waiting = new Set<(e: InstallPromptEvent | null) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    waiting.forEach((notify) => notify(deferred))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    waiting.forEach((notify) => notify(null))
  })
}

/** Offers the browser's "install app" prompt when it is available (Chrome, Edge, Android). */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(deferred)

  useEffect(() => {
    waiting.add(setEvent)
    setEvent(deferred)
    return () => {
      waiting.delete(setEvent)
    }
  }, [])

  const install = useCallback(async () => {
    if (!event) return
    await event.prompt()
    await event.userChoice
    deferred = null
    waiting.forEach((notify) => notify(null))
  }, [event])

  return { canInstall: event !== null, install }
}

/** True while the device has a connection. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}
