import { useSyncExternalStore } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, Bell, Clock, Home, User } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { Logo, LogoMark } from '@/components/Logo'
import { sessionStore } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { cn } from '@/lib/utils'

const desktopLinks = [
  { to: '/', label: 'Browse', end: true },
  { to: '/nearby', label: 'Nearby' },
  { to: '/requests', label: 'Requests' },
  { to: '/credits', label: 'Credits' },
  { to: '/my-skills', label: 'My skills' },
]

const phoneLinks = [
  { to: '/', label: 'Browse', icon: Home, end: true },
  { to: '/requests', label: 'Requests', icon: ArrowLeftRight },
  { to: '/credits', label: 'Credits', icon: Clock },
  { to: '/profile', label: 'Profile', icon: User },
]

function BalanceChip({ balance }: { balance: number }) {
  return (
    <Link
      to="/credits"
      aria-label={`Your balance is ${formatCredits(balance)} hours`}
      className="press flex h-11 items-center gap-2 rounded-full bg-wine-800 px-4 text-wine-on shadow-card"
    >
      <Clock className="size-[18px] text-brass" aria-hidden="true" />
      <span className="font-heading text-[17px] leading-none font-bold tracking-[-0.02em]">
        {formatCredits(balance)} h
      </span>
    </Link>
  )
}

function BellButton({ unread }: { unread: number }) {
  return (
    <Link
      to="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className="press relative grid size-11 place-items-center rounded-full border bg-card"
    >
      <Bell className="size-[19px]" aria-hidden="true" />
      {unread > 0 ? (
        <span className="absolute top-2 right-2.5 size-2.5 rounded-full border-2 border-card bg-wine-600" />
      ) : null}
    </Link>
  )
}

export function AppLayout() {
  const { me, unread } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-wine-800 focus:px-4 focus:py-2 focus:text-wine-on"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" aria-label="timebank/connect home" className="hidden lg:block">
            <Logo />
          </Link>
          <Link to="/" aria-label="timebank/connect home" className="lg:hidden">
            <LogoMark />
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-0.5 rounded-full border bg-card/80 p-1 lg:flex"
          >
            {desktopLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-[18px] py-2.5 text-sm font-semibold transition-colors duration-200',
                    isActive ? 'bg-wine-800 text-wine-on' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <BalanceChip balance={me.credit_balance} />
            <BellButton unread={unread} />
            <Link to="/profile" aria-label="Your profile" className="press rounded-full">
              <Avatar name={me.name} size={44} />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-1 rounded-full bg-wine-800 p-1.5 shadow-[0_16px_36px_-10px_rgb(42_10_20/0.55)] lg:hidden"
      >
        {phoneLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold transition-colors duration-200',
                isActive ? 'bg-stone-50 text-wine-700' : 'text-wine-on-muted',
              )
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
