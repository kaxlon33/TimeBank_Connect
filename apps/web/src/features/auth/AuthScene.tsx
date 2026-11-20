import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { usePrefersReducedMotion } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const ticker = [
  { who: 'KZ', text: 'Kyaw taught Aye her first guitar chords', hours: '+1.0h' },
  { who: 'DO', text: 'Daniel built Sophie’s new bookshelf', hours: '+1.0h' },
  { who: 'ML', text: 'Mei set up video calls for Priya’s mum', hours: '+0.5h' },
  { who: 'HA', text: 'Hassan moved Tom two streets over', hours: '+2.5h' },
]

const neighbours = [
  { i: 'AC', tone: 'bg-[#efe1e4] text-[#5e1a2b]' },
  { i: 'DO', tone: 'bg-[#e9e2d6] text-[#5a4320]' },
  { i: 'PR', tone: 'bg-[#e1e4e8] text-[#2f3a4a]' },
  { i: 'ML', tone: 'bg-[#e4e9e2] text-[#2f4a33]' },
  { i: 'SM', tone: 'bg-[#f3e6e8] text-[#5e1a2b]' },
]

/** Steps through items; `count` stays 0 until the first change so the first item renders without animating. */
function useCycle(length: number, ms: number, enabled: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setCount((n) => n + 1), ms)
    return () => window.clearInterval(id)
  }, [ms, enabled])
  return { index: count % length, count }
}

function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden bg-wine-900">
      <div className="aurora-a absolute -top-[30%] -left-[20%] size-[80vmax] rounded-full bg-[radial-gradient(closest-side,#7a2236_0%,transparent_70%)] opacity-90" />
      <div className="aurora-b absolute -right-[25%] -bottom-[35%] size-[75vmax] rounded-full bg-[radial-gradient(closest-side,#5e1a2b_0%,transparent_70%)]" />
      <div className="aurora-a absolute top-[20%] right-[10%] size-[40vmax] rounded-full bg-[radial-gradient(closest-side,rgb(217_183_126/0.16)_0%,transparent_70%)] [animation-duration:34s]" />
      <div className="spin-slow absolute top-1/2 left-1/2 size-[140vmax] -translate-x-1/2 -translate-y-1/2">
        <div className="size-full bg-[repeating-radial-gradient(circle_at_center,transparent_0_46px,rgb(245_242_238/0.05)_46px_47px)]" />
      </div>
      <div className="grain absolute inset-0" />
      {/* Scrim keeps text contrast steady whatever the gradient is doing. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(42_10_20/0.35)_0%,rgb(42_10_20/0.1)_40%,rgb(42_10_20/0.55)_100%)]" />
    </div>
  )
}

interface Props {
  verbs: string[]
  /** Accessible version of the headline, read instead of the animated one. */
  headlineLabel: string
  secondLine: string
  intro: string
  headerLink: { to: string; hint: string; label: string }
  cardLabelledBy: string
  wideCard?: boolean
  children: ReactNode
}

/** Full-bleed burgundy scene shared by Login and Register: story on the left, floating card on the right. */
export function AuthScene({ verbs, headlineLabel, secondLine, intro, headerLink, cardLabelledBy, wideCard = false, children }: Props) {
  const reduced = usePrefersReducedMotion()
  const { index: verb, count: verbChanges } = useCycle(verbs.length, 2600, !reduced)
  const { index: tick, count: tickChanges } = useCycle(ticker.length, 4200, !reduced)
  const item = ticker[tick]

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip text-wine-on">
      <Background />

      <header className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
        <Link to="/" className="inline-flex min-h-11 items-center" aria-label="TimeBank Connect">
          <Logo onDark tiny />
        </Link>
        <Link
          to={headerLink.to}
          className="glass group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-white/15"
        >
          <span className="hidden font-medium text-wine-on-muted sm:inline">{headerLink.hint}</span> {headerLink.label}
          <ArrowRight className="nudge size-4" aria-hidden="true" />
        </Link>
      </header>

      <main
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-5 sm:px-8 lg:grid lg:items-center lg:gap-12',
          wideCard ? 'lg:grid-cols-[minmax(0,1fr)_520px]' : 'lg:grid-cols-[minmax(0,1fr)_420px]',
        )}
      >
        <section className="pt-10 pb-8 lg:py-8" aria-label="About TimeBank Connect">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden="true">
              {neighbours.map((n) => (
                <span key={n.i} className={cn('grid size-8 place-items-center rounded-full text-[0.65rem] font-bold ring-2 ring-wine-900', n.tone)}>
                  {n.i}
                </span>
              ))}
            </div>
            <p className="text-sm text-wine-on-muted">
              <span className="font-semibold text-wine-on">9 neighbours</span> in 6 areas
            </p>
          </div>

          <p
            role="heading"
            aria-level={1}
            aria-label={headlineLabel}
            className="mt-6 font-heading text-[3.1rem] leading-[0.92] font-bold tracking-[-0.035em] sm:text-[5rem] xl:text-[6rem]"
          >
            <span aria-hidden="true" className="block whitespace-nowrap">
              <span className="inline-flex overflow-hidden pb-[0.08em] align-bottom">
                <span key={verbChanges} className={cn('text-brass', verbChanges > 0 && 'word-in')}>
                  {verbs[verb]}
                </span>
              </span>{' '}
              an hour.
            </span>
            <span aria-hidden="true" className="block text-wine-on/90">
              {secondLine}
            </span>
          </p>

          <p className="mt-5 max-w-lg text-base text-wine-on-muted sm:text-lg">{intro}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { k: '1h', v: '= 1 credit' },
              { k: '3', v: 'starter credits' },
            ].map((c, i) => (
              <span key={c.k} className="glass drift inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm" style={{ '--delay': `${i * 900}ms` } as CSSProperties}>
                <span className="numeral text-lg">{c.k}</span>
                <span className="text-wine-on-muted">{c.v}</span>
              </span>
            ))}
            <span className="glass drift inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm" style={{ '--delay': '1800ms' } as CSSProperties}>
              <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#9fe0b4] opacity-60 motion-reduce:hidden" />
                <span className="relative size-2.5 rounded-full bg-[#9fe0b4]" />
              </span>
              <span>4 helpers online</span>
            </span>
            <span className="glass drift hidden h-11 items-center gap-1.5 rounded-full px-4 text-sm sm:inline-flex" style={{ '--delay': '2700ms' } as CSSProperties}>
              <Star className="size-4 fill-brass text-brass" aria-hidden="true" />
              <span className="numeral text-lg">4.8</span>
              <span className="text-wine-on-muted">average rating</span>
            </span>
          </div>

          <div className="mt-4 max-w-lg">
            <p className="sr-only">Recent exchanges: {ticker.map((t) => t.text).join('; ')}.</p>
            <div aria-hidden="true" className="glass flex h-14 items-center gap-3 overflow-hidden rounded-[16px] px-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-wine-on text-xs font-bold text-wine-800">{item.who}</span>
              <span key={tick} className={cn(tickChanges > 0 && 'tick-in', 'flex min-w-0 flex-1 items-center justify-between gap-3')}>
                <span className="truncate text-sm">{item.text}</span>
                <span className="numeral shrink-0 text-base text-brass">{item.hours}</span>
              </span>
            </div>
          </div>
        </section>

        <section
          aria-labelledby={cardLabelledBy}
          className="tile-in relative -mx-5 mt-auto rounded-t-[28px] bg-stone-50/97 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-foreground shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)] backdrop-blur-xl sm:-mx-8 sm:p-8 lg:mx-0 lg:mt-0 lg:mb-8 lg:rounded-[28px] lg:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.65),inset_0_1px_0_rgb(255_255_255/0.8)]"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200 lg:hidden" aria-hidden="true" />
          {children}
        </section>
      </main>
    </div>
  )
}
