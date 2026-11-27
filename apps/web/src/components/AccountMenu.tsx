import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Download, Loader2, LogOut, Sparkles, User } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { api } from '@/lib/api'
import { useInstallPrompt } from '@/lib/pwa'
import type { User as Member } from '@/types'

const item =
  'flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-bold outline-none select-none data-[highlighted]:bg-secondary'

/** True on an iPhone or iPad browser that is not already the installed app. */
function isIphoneBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const installed = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return apple && !installed
}

/** The member's avatar with a small menu: their pages, installing the app and logging out. */
export function AccountMenu({ me }: { me: Member }) {
  const navigate = useNavigate()
  const { canInstall, install } = useInstallPrompt()
  const [leaving, setLeaving] = useState(false)

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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Your account menu" className="press rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar name={me.name} src={me.avatar_url} size={44} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="z-50 w-[260px] rounded-2xl border bg-popover p-2 shadow-raised data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={me.name} src={me.avatar_url} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{me.name}</p>
              <p className="truncate text-xs text-muted-foreground">{me.email}</p>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link to="/profile" className={item}>
              <User className="size-4 text-wine-700" aria-hidden="true" />
              Your profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="/my-skills" className={item}>
              <Sparkles className="size-4 text-wine-700" aria-hidden="true" />
              My skills
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="/hours" className={item}>
              <Clock className="size-4 text-wine-700" aria-hidden="true" />
              Your hours
            </Link>
          </DropdownMenu.Item>
          {canInstall ? (
            <DropdownMenu.Item className={item} onSelect={() => void install()}>
              <Download className="size-4 text-wine-700" aria-hidden="true" />
              Install the app
            </DropdownMenu.Item>
          ) : isIphoneBrowser() ? (
            // iPhone Safari has no install button; the member adds it from the Share menu instead.
            <p className="flex items-start gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Download className="mt-0.5 size-4 shrink-0 text-wine-700" aria-hidden="true" />
              To install: tap Share, then “Add to Home Screen”.
            </p>
          ) : null}
          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
          <DropdownMenu.Item className={`${item} text-negative`} disabled={leaving} onSelect={() => void logOut()}>
            {leaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
