import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Wifi } from 'lucide-react'
import { formatCredits } from '@/lib/format'

interface Props {
  name: string
  memberId: number | string
  since: string
  balance: number
}

/** The balance as a bank card: chip, contactless mark, member number and a light sheen that follows the pointer. */
export function BankCard({ name, memberId, since, balance }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false })

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const px = (e.clientX - box.left) / box.width
    const py = (e.clientY - box.top) / box.height
    setTilt({ x: (px - 0.5) * 2, y: (py - 0.5) * 2, active: true })
  }

  const style = {
    transform: tilt.active ? `perspective(900px) rotateY(${tilt.x * 7}deg) rotateX(${tilt.y * -7}deg)` : 'perspective(900px)',
    '--sheen-x': `${50 + tilt.x * 40}%`,
    '--sheen-y': `${50 + tilt.y * 40}%`,
  } as CSSProperties

  const number = String(memberId).padStart(4, '0')
  const month = new Date(since).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0, active: false })}
      style={style}
      aria-label={`Your time bank card. Balance ${formatCredits(balance)} ${balance === 1 ? 'credit' : 'credits'}`}
      role="group"
      className="relative isolate aspect-[1.586/1] w-full max-w-[460px] overflow-hidden rounded-[28px] bg-gradient-to-br from-wine-600 via-wine-800 to-wine-900 p-5 text-white shadow-raised transition-transform duration-200 ease-out sm:p-7"
    >
      <div aria-hidden="true" className="rings pointer-events-none absolute inset-0 -z-10 opacity-80" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(420px circle at var(--sheen-x, 50%) var(--sheen-y, 20%), rgba(255,255,255,0.16), transparent 55%)',
        }}
      />
      <div aria-hidden="true" className="absolute -top-24 -right-16 size-64 rounded-full bg-brass/20 blur-3xl" />

      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="" width={36} height={36} className="size-8 rounded-[24%]" />
            <span className="text-[15px] font-bold tracking-tight">
              timebank<span className="text-brass">/connect</span>
            </span>
          </div>
          <Wifi className="size-6 rotate-90 text-white/70" aria-hidden="true" />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-wine-on-muted uppercase">Balance</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="numeral text-[clamp(2.75rem,9vw,5rem)] text-white">{formatCredits(balance)}</span>
              <span className="font-heading text-lg font-semibold text-wine-on-muted">{balance === 1 ? 'credit' : 'credits'}</span>
            </p>
          </div>
          {/* Chip */}
          <span
            aria-hidden="true"
            className="relative mb-1.5 hidden h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brass via-[#f0d9a8] to-brass shadow-card sm:block"
          >
            <span className="absolute inset-x-0 top-1/2 h-px bg-wine-900/35" />
            <span className="absolute inset-y-0 left-1/3 w-px bg-wine-900/35" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-wine-900/35" />
            <span className="absolute inset-x-3 inset-y-2.5 rounded-sm border border-wine-900/35" />
          </span>
        </div>

        <div>
          <p className="font-heading text-sm tracking-[0.2em] sm:text-lg sm:tracking-[0.22em] text-white/90 tabular-nums">•••• •••• •••• {number}</p>
          <div className="mt-2.5 flex items-end justify-between gap-3">
            <p className="truncate text-sm font-bold tracking-[0.12em] uppercase">{name}</p>
            <p className="shrink-0 text-right text-[10px] leading-tight font-semibold tracking-[0.1em] text-wine-on-muted uppercase">
              Member since
              <span className="block text-sm font-bold tracking-normal text-white">{month}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
