import { useSyncExternalStore, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { sessionStore } from '@/lib/api'

const homeFor = (role: 'member' | 'admin') => (role === 'admin' ? '/admin' : '/')

/**
 * Sends logged-out visitors to the login page, and brings them back to where they were going afterwards.
 * Members and admins each have their own area: the wrong one sends them to their own home.
 */
export function RequireAuth({ children, role = 'member' }: { children: ReactNode; role?: 'member' | 'admin' }) {
  const { signedIn, me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const location = useLocation()
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (me.role !== role) return <Navigate to={homeFor(me.role)} replace />
  return <>{children}</>
}

/** Login and sign-up pages are for logged-out visitors. A logged-in person goes straight to their own area. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { signedIn, me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (signedIn) return <Navigate to={from ?? homeFor(me.role)} replace />
  return <>{children}</>
}
