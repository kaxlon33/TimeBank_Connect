import { useSyncExternalStore, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { sessionStore } from '@/lib/api'

/** Sends logged-out visitors to the login page, and brings them back to where they were going afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const location = useLocation()
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

/** Login and sign-up pages are for logged-out visitors. A logged-in member goes straight to the app. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { signedIn } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (signedIn) return <Navigate to={from ?? '/'} replace />
  return <>{children}</>
}
