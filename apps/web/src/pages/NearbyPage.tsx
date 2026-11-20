import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Crosshair, Loader2, MapPinOff, Users } from 'lucide-react'
import { HelperRow } from '@/features/nearby/HelperRow'
import { NearbyMap } from '@/features/nearby/NearbyMap'
import { api, sessionStore } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const RADII = [1, 3, 5, 10] as const
type Radius = (typeof RADII)[number]

interface Position {
  lat: number
  lng: number
  source: 'home' | 'device'
}

export function NearbyPage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const [radius, setRadius] = useState<Radius>(5)
  const [position, setPosition] = useState<Position | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | string | null>(null)
  const rows = useRef(new Map<number | string, HTMLLIElement>())

  // Start from the member's saved area. The device location is only used when they ask for it.
  const home: Position | null = me.area ? { lat: me.area.latitude, lng: me.area.longitude, source: 'home' } : null
  const here = position ?? home

  const helpers = useAsync(() => (here ? api.getNearbyHelpers(here, radius) : Promise.resolve([])), `${here?.lat}|${here?.lng}|${radius}`)
  const list = helpers.status === 'success' ? helpers.data : []

  useEffect(() => {
    if (selected === null) return
    rows.current.get(selected)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocationError('Your browser cannot share your location. We are using your saved area instead.')
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'device' })
        setSelected(null)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is switched off for this site. We are using your saved area instead.'
            : 'We could not find your location. We are using your saved area instead.',
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const where = here?.source === 'device' ? 'your location' : (me.area?.name ?? 'your area')

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in pt-2">
        <div>
          <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            Neighbours who can help, around {where}
          </p>
          <h1 className="font-heading mt-2 text-[clamp(2rem,4.2vw,3rem)] leading-[0.98] font-bold tracking-[-0.045em]">
            Helpers <span className="text-wine-700">near you</span>
          </h1>
        </div>
      </header>

      {locationError ? (
        <p role="status" className="mt-4 rounded-2xl bg-status-pending-bg px-4 py-3 text-sm font-semibold text-status-pending">
          {locationError}
        </p>
      ) : null}

      {!here ? (
        <div className="mt-7 rounded-[28px] border bg-card p-10 text-center shadow-card sm:p-16">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
            <MapPinOff className="size-7" aria-hidden="true" />
          </span>
          <p className="font-heading mt-5 text-2xl font-bold tracking-[-0.03em]">We need to know where you are</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Share your location, or add your area on your profile.</p>
          <button
            type="button"
            onClick={useMyLocation}
            className="press mt-6 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Use my location
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="tile-in relative isolate h-[420px] overflow-hidden rounded-[32px] border bg-muted shadow-raised sm:h-[500px] lg:sticky lg:top-24 lg:h-[640px]">
            <NearbyMap centre={here} radiusKm={radius} helpers={list} selectedId={selected} onSelect={setSelected} />

            <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
              <div
                role="radiogroup"
                aria-label="Search distance"
                className="pointer-events-auto flex gap-0.5 rounded-full bg-card/92 p-1 shadow-raised backdrop-blur-md"
              >
                {RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={radius === r}
                    onClick={() => {
                      setRadius(r)
                      setSelected(null)
                    }}
                    className={cn(
                      'h-9 rounded-full px-3 text-[13px] font-bold transition-colors sm:px-4 sm:text-sm',
                      radius === r ? 'bg-wine-700 text-wine-on shadow-card' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r} km
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                aria-label={here?.source === 'device' ? 'Using your location' : 'Use my location'}
                className={cn(
                  'press pointer-events-auto flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-bold shadow-raised backdrop-blur-md disabled:opacity-60',
                  here?.source === 'device' ? 'bg-wine-700 text-wine-on' : 'bg-card/92 hover:bg-card',
                )}
              >
                {locating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="size-4" aria-hidden="true" />
                )}
                <span className="max-sm:sr-only">{here?.source === 'device' ? 'Using your location' : 'Use my location'}</span>
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] sm:bottom-4 sm:left-4">
              <span className="rounded-full bg-wine-900/90 px-4 py-2 text-[13px] font-bold text-white shadow-raised backdrop-blur-md">
                {helpers.status === 'success'
                  ? `${list.length} ${list.length === 1 ? 'helper' : 'helpers'} within ${radius} km`
                  : 'Looking around…'}
              </span>
            </div>
          </div>

          <section aria-label="Helpers" className="space-y-3">
            {helpers.status === 'loading' ? (
              <div className="space-y-3" aria-busy="true">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="skeleton-shimmer h-[132px] rounded-[22px]" />
                ))}
              </div>
            ) : helpers.status === 'error' ? (
              <div role="alert" className="rounded-[28px] border bg-card p-8 text-center">
                <p className="font-heading text-xl font-bold">We couldn’t load helpers</p>
                <p className="mt-1 text-sm text-muted-foreground">{helpers.error.message}</p>
                <button
                  type="button"
                  onClick={helpers.reload}
                  className="press mt-4 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
                >
                  Try again
                </button>
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-[28px] border bg-card p-8 text-center shadow-card">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-wine-700">
                  <Users className="size-6" aria-hidden="true" />
                </span>
                <p className="font-heading mt-4 text-xl font-bold tracking-[-0.02em]">No helpers within {radius} km</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Try a wider distance to see more people around you.</p>
                {radius < 10 ? (
                  <button
                    type="button"
                    onClick={() => setRadius(10)}
                    className="press mt-5 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
                  >
                    Search within 10 km
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((h, i) => (
                  <HelperRow
                    key={h.user.id}
                    ref={(el) => {
                      if (el) rows.current.set(h.user.id, el)
                      else rows.current.delete(h.user.id)
                    }}
                    helper={h}
                    closest={i === 0 && list.length > 1}
                    index={i}
                    selected={selected === h.user.id}
                    onSelect={() => setSelected(selected === h.user.id ? null : h.user.id)}
                  />
                ))}
              </ul>
            )}
            <p className="px-1 pt-1 text-xs text-muted-foreground">
              Helpers are shown near their neighbourhood, never at an exact address.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
