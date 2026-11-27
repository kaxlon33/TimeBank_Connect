import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Flag, Globe2, LayoutGrid, Loader2, LogOut, Menu, ShieldAlert, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { Logo } from '@/components/Logo'
import { api, sessionStore } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/moderation', label: 'Moderation', icon: Flag, badge: true },
  { to: '/admin/places', label: 'Places', icon: Globe2 },
  { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
] as const

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { me, openReports: open } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const stats = useAsync(() => api.getAdminStats(), 'admin-stats')
  const [leaving, setLeaving] = useState(false)
  const balanced = stats.status === 'success' ? stats.data.ledger_balanced : true

  async function logOut() {
    setLeaving(true)
    try {
      await api.logout()
      toast.success('You are logged out')
      navigate('/login', { replace: true })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="flex flex-col items-start gap-3">
        <Logo onDark className="text-white" />
        <span className="rounded-full border border-brass/40 bg-brass/15 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-brass">
          ADMIN CONSOLE
        </span>
      </div>

      <nav aria-label="Admin" className="flex flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex h-12 items-center gap-3 rounded-2xl border px-3.5 text-[15px] font-bold transition-colors',
                isActive
                  ? 'border-white/15 bg-white/10 text-white'
                  : 'border-transparent text-wine-on-muted hover:bg-white/5 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('size-[19px]', isActive ? 'text-brass' : '')} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && open > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1.5 text-[11px] font-bold text-wine-900">
                    <span className="sr-only">{open} open reports</span>
                    <span aria-hidden="true">{open}</span>
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            {balanced ? (
              <ShieldCheck className="size-4 text-[#9be3b4]" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-4 text-brass" aria-hidden="true" />
            )}
            {balanced ? 'Ledger balanced' : 'Check the ledger'}
          </p>
          <p className="mt-1.5 text-xs text-wine-on-muted">
            {stats.status === 'success' ? `${formatCredits(stats.data.credits_in_circulation)} h in circulation` : 'Checking…'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/admin/profile"
            onClick={onNavigate}
            aria-label="Your profile"
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-1.5 pr-2 transition-colors',
                isActive ? 'border-white/15 bg-white/10' : 'border-transparent hover:bg-white/5',
              )
            }
          >
            <Avatar name={me.name} src={me.avatar_url} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">{me.name}</span>
              <span className="block truncate text-xs text-wine-on-muted">Your profile</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={logOut}
            disabled={leaving}
            aria-label="Log out"
            title="Log out"
            className="press grid size-10 shrink-0 place-items-center rounded-xl text-wine-on-muted hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            {leaving ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The admin frame: a dark sidebar on laptops, a top bar with a slide-in menu on phones. */
export function AdminShell() {
  const [menu, setMenu] = useState(false)

  return (
    <div className="min-h-dvh bg-background lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] overflow-hidden bg-wine-900 lg:block">
        <div className="grain relative h-full overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-32 size-[380px] rounded-full bg-wine-600/40 blur-3xl"
          />
          <div className="relative h-full">
            <SidebarBody />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-wine-900 px-4 text-white lg:hidden">
        <Logo onDark />
        <Dialog.Root open={menu} onOpenChange={setMenu}>
          <Dialog.Trigger
            aria-label="Open the admin menu"
            className="press grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-wine-900/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[286px] max-w-[88vw] overflow-y-auto bg-wine-900 text-white shadow-raised outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
              <Dialog.Title className="sr-only">Admin menu</Dialog.Title>
              <Dialog.Description className="sr-only">Move between the admin pages.</Dialog.Description>
              <Dialog.Close
                aria-label="Close the menu"
                className="press absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full text-wine-on-muted hover:bg-white/10"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
              <SidebarBody onNavigate={() => setMenu(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-16 outline-none sm:px-8 lg:px-10 lg:pt-10">
        <Outlet />
      </main>
    </div>
  )
}

/** The big title row used at the top of every admin page. */
export function AdminHeader({ kicker, title, aside }: { kicker: string; title: string; aside?: ReactNode }) {
  return (
    <header className="tile-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{kicker}</p>
        <h1 className="font-heading mt-1.5 text-[clamp(2rem,4.2vw,3.25rem)] leading-[0.98] font-bold tracking-[-0.045em]">{title}</h1>
      </div>
      {aside}
    </header>
  )
}
