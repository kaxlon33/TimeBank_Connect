import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AvailabilityEditor } from '@/features/profile/AvailabilityEditor'
import { sessionStore } from '@/lib/api'

export function HoursPage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in pt-2">
        <Link to="/profile" className="group inline-flex items-center gap-1.5 text-sm font-bold text-wine-700">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          Profile
        </Link>
        <h1 className="font-heading mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[0.98] font-bold tracking-[-0.045em] text-balance">
          Your usual <span className="text-wine-700">hours</span>
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Switch on the days you are free and choose your hours. Neighbours see these when they ask you for help.
        </p>
      </header>

      <section
        aria-label="Weekly hours"
        className="tile-in mt-7 rounded-[28px] bg-primary-soft p-6 sm:p-8"
        style={{ '--delay': '60ms' } as React.CSSProperties}
      >
        <AvailabilityEditor key={me.id} slots={me.availability} />
      </section>
    </div>
  )
}
