import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Crosshair, List, Loader2, MapPin, MapPinOff, Minus, Navigation, Plus, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import { FilterPanel, RADII, type Radius } from '@/features/nearby/FilterPanel'
import { HelperListItem } from '@/features/nearby/HelperListItem'
import { HelperRow } from '@/features/nearby/HelperRow'
import { matchesFilters } from '@/features/nearby/filters'
import { NearbyMap, type NearbyMapHandle } from '@/features/nearby/NearbyMap'
import { PreviewCard } from '@/features/nearby/PreviewCard'
import { api, sessionStore } from '@/lib/api'
import { useAsync, useMediaQuery } from '@/lib/hooks'
import { usePersistentState } from '@/lib/storage'
import { cn } from '@/lib/utils'

type View = 'map' | 'list'
type Sort = 'nearest' | 'rated'

interface Position {
  lat: number
  lng: number
  source: 'home' | 'device'
}

export function NearbyPage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const mapRef = useRef<NearbyMapHandle>(null)
  const rows = useRef(new Map<number | string, HTMLLIElement>())
  const listBox = useRef<HTMLDivElement>(null)

  // The view, distance and sort are remembered in the browser for next time.
  const [view, setView] = usePersistentState<View>('nearby.view', 'map', (v) => v === 'map' || v === 'list')
  const [radius, setRadius] = usePersistentState<Radius>('nearby.radius', 10, (v) => RADII.some((r) => r === v))
  const [text, setText] = useState('')
  const [chip, setChip] = useState<string | null>(null)
  const [availableNow, setAvailableNow] = useState(false)
  const [sort, setSort] = usePersistentState<Sort>('nearby.sort', 'nearest', (v) => v === 'nearest' || v === 'rated')
  const [selected, setSelected] = useState<number | string | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Start from the member's saved area. The device location is only used when they ask for it.
  const home: Position | null = me.area ? { lat: me.area.latitude, lng: me.area.longitude, source: 'home' } : null
  const here = position ?? home

  const fetched = useAsync(() => (here ? api.getNearbyHelpers(here, radius) : Promise.resolve([])), `${here?.lat}|${here?.lng}|${radius}`)

  const list = useMemo(() => {
    const base = fetched.status === 'success' ? fetched.data.filter((h) => matchesFilters(h, text, chip, availableNow)) : []
    return sort === 'rated' ? [...base].sort((a, b) => (b.user.rating_avg ?? 0) - (a.user.rating_avg ?? 0)) : base
  }, [fetched, text, chip, availableNow, sort])

  const chosen = list.find((h) => h.user.id === selected) ?? null
  const filtersOn = Boolean(text || chip || availableNow)

  useEffect(() => {
    if (selected !== null && !chosen) setSelected(null)
  }, [selected, chosen])

  // Keep the chosen helper visible in the list, scrolling only the list itself and never the page.
  useEffect(() => {
    const box = listBox.current
    const row = selected === null ? null : rows.current.get(selected)
    if (!box || !row) return
    const top = row.offsetTop - box.offsetTop
    if (top < box.scrollTop) box.scrollTo({ top: top - 8, behavior: 'smooth' })
    else if (top + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTo({ top: top + row.offsetHeight - box.clientHeight + 8, behavior: 'smooth' })
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

  function clearFilters() {
    setText('')
    setChip(null)
    setAvailableNow(false)
  }

  const where = me.area?.name ?? 'your area'
  const status = here?.source === 'device' ? 'Using your location' : `Using your saved area · ${where}`

  const panel = (
    <FilterPanel
      text={text}
      onText={setText}
      radius={radius}
      onRadius={(r) => {
        setRadius(r)
        setSelected(null)
      }}
      chip={chip}
      onChip={setChip}
      availableNow={availableNow}
      onAvailableNow={setAvailableNow}
    />
  )

  const countText =
    fetched.status === 'success' ? `${list.length} ${list.length === 1 ? 'helper' : 'helpers'} within ${radius} km` : 'Looking around…'

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="font-heading text-[clamp(2rem,4.2vw,3rem)] leading-[0.98] font-bold tracking-[-0.045em]">Helpers near you</h1>
          <span
            role="status"
            className={cn(
              'flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold',
              here ? 'bg-status-completed-bg text-status-completed' : 'bg-muted text-muted-foreground',
            )}
          >
            <span className={cn('size-2 rounded-full', here ? 'bg-status-completed' : 'bg-stone-300')} aria-hidden="true" />
            {here ? status : 'Location needed'}
          </span>
        </div>
        <div role="radiogroup" aria-label="View" className="flex gap-1 self-start rounded-full bg-card p-1 shadow-card sm:self-auto">
          {(
            [
              { value: 'map', label: 'Map', icon: MapPin },
              { value: 'list', label: 'List', icon: List },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={view === value}
              onClick={() => setView(value)}
              className={cn(
                'flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors',
                view === value ? 'bg-wine-800 text-wine-on' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
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
      ) : view === 'map' ? (
        <div className="tile-in mt-5 lg:relative lg:h-[700px] lg:overflow-hidden lg:rounded-[32px] lg:border lg:shadow-raised">
          <div className="relative isolate h-[440px] overflow-hidden rounded-[28px] border shadow-raised sm:h-[520px] lg:absolute lg:inset-0 lg:h-auto lg:rounded-none lg:border-0 lg:shadow-none">
            <NearbyMap
              ref={mapRef}
              centre={here}
              radiusKm={radius}
              helpers={list}
              selectedId={selected}
              onSelect={setSelected}
              onPoint={setPoint}
            />

            {chosen ? (
              <div
                className={cn('absolute z-[600]', desktop ? 'w-[270px]' : 'inset-x-3 bottom-[76px] flex justify-center')}
                style={desktop && point ? { left: point.x, top: point.y - 52, transform: 'translate(-50%, -100%)' } : undefined}
              >
                <PreviewCard helper={chosen} />
              </div>
            ) : null}

            <div className="absolute bottom-3 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-1 rounded-full bg-card/95 p-1.5 shadow-raised backdrop-blur-md sm:bottom-4">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="press flex h-11 items-center gap-2 rounded-full bg-wine-800 px-4 text-sm font-bold whitespace-nowrap text-wine-on hover:bg-wine-700 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="size-4" aria-hidden="true" />
                )}
                {here.source === 'device' ? 'Your location' : where} · update
              </button>
              <button
                type="button"
                aria-label="Centre the map on me"
                onClick={() => {
                  setSelected(null)
                  mapRef.current?.recenter()
                }}
                className="press grid size-11 place-items-center rounded-full hover:bg-secondary"
              >
                <Navigation className="size-4" aria-hidden="true" />
              </button>
              <span className="h-6 w-px bg-border" aria-hidden="true" />
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="press grid size-11 place-items-center rounded-full hover:bg-secondary"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="press grid size-11 place-items-center rounded-full hover:bg-secondary"
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4 lg:absolute lg:top-4 lg:left-4 lg:z-[700] lg:mt-0 lg:w-[300px]">{panel}</div>

          <aside
            aria-label="Helpers"
            className="mt-4 flex flex-col overflow-hidden rounded-[24px] bg-card/95 shadow-raised backdrop-blur-md lg:absolute lg:top-4 lg:right-4 lg:bottom-auto lg:max-h-[calc(100%-2rem)] lg:z-[700] lg:mt-0 lg:w-[350px]"
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <h2 className="font-heading text-lg font-bold tracking-[-0.02em]" aria-live="polite">
                {countText}
              </h2>
              <button
                type="button"
                aria-label={sort === 'nearest' ? 'Sorted by nearest. Sort by top rated' : 'Sorted by top rated. Sort by nearest'}
                aria-pressed={sort === 'rated'}
                onClick={() => setSort(sort === 'nearest' ? 'rated' : 'nearest')}
                className={cn(
                  'press grid size-9 place-items-center rounded-xl hover:bg-secondary',
                  sort === 'rated' && 'bg-primary-soft text-wine-700',
                )}
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div ref={listBox} className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {fetched.status === 'loading' ? (
                <div className="space-y-2.5" aria-busy="true">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="skeleton-shimmer h-[78px] rounded-[20px]" />
                  ))}
                </div>
              ) : fetched.status === 'error' ? (
                <div role="alert" className="rounded-2xl bg-muted p-6 text-center">
                  <p className="font-heading text-lg font-bold">We couldn’t load helpers</p>
                  <button
                    type="button"
                    onClick={fetched.reload}
                    className="press mt-3 h-10 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on hover:bg-wine-600"
                  >
                    Try again
                  </button>
                </div>
              ) : list.length === 0 ? (
                <div className="rounded-2xl bg-muted p-6 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-wine-700">
                    <Users className="size-5" aria-hidden="true" />
                  </span>
                  <p className="font-heading mt-3 text-lg font-bold">No helpers match</p>
                  <p className="mx-auto mt-1 max-w-[220px] text-xs text-muted-foreground">Try a wider distance or fewer filters.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {filtersOn ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="press h-9 rounded-xl border bg-card px-3.5 text-xs font-bold hover:bg-secondary"
                      >
                        Clear filters
                      </button>
                    ) : null}
                    {radius < RADII[RADII.length - 1] ? (
                      <button
                        type="button"
                        onClick={() => setRadius(10)}
                        className="press h-9 rounded-xl bg-wine-700 px-3.5 text-xs font-bold text-wine-on hover:bg-wine-600"
                      >
                        Search 10 km
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {list.map((h, i) => (
                    <HelperListItem
                      key={h.user.id}
                      ref={(el) => {
                        if (el) rows.current.set(h.user.id, el)
                        else rows.current.delete(h.user.id)
                      }}
                      helper={h}
                      index={i}
                      selected={selected === h.user.id}
                      onSelect={() => setSelected(selected === h.user.id ? null : h.user.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="m-3 mt-0 flex items-start gap-3 rounded-2xl bg-primary-soft p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-wine-700" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-wine-800">
                <span className="block font-bold">Privacy first</span>
                Distances use each member’s area, never an exact address.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="tile-in">
            <FilterPanel
              bar
              text={text}
              onText={setText}
              radius={radius}
              onRadius={(r) => {
                setRadius(r)
                setSelected(null)
              }}
              chip={chip}
              onChip={setChip}
              availableNow={availableNow}
              onAvailableNow={setAvailableNow}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-heading text-xl font-bold tracking-[-0.02em]" aria-live="polite">
              {countText}
            </p>
            <div role="radiogroup" aria-label="Sort helpers" className="flex gap-1 rounded-full bg-card p-1 shadow-card">
              {(
                [
                  { value: 'nearest', label: 'Nearest' },
                  { value: 'rated', label: 'Top rated' },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={sort === o.value}
                  onClick={() => setSort(o.value)}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-bold transition-colors',
                    sort === o.value ? 'bg-wine-800 text-wine-on' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {fetched.status === 'loading' ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-[400px] rounded-[28px]" />
              ))}
            </div>
          ) : fetched.status === 'error' ? (
            <div role="alert" className="rounded-[28px] border bg-card p-10 text-center">
              <p className="font-heading text-xl font-bold">We couldn’t load helpers</p>
              <button
                type="button"
                onClick={fetched.reload}
                className="press mt-4 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
              >
                Try again
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-[28px] border bg-card p-10 text-center shadow-card sm:p-16">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
                <Users className="size-7" aria-hidden="true" />
              </span>
              <p className="font-heading mt-5 text-2xl font-bold tracking-[-0.03em]">No helpers match</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Try a wider distance or fewer filters.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                {filtersOn ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="press h-11 rounded-2xl border bg-card px-5 text-sm font-bold hover:bg-secondary"
                  >
                    Clear filters
                  </button>
                ) : null}
                {radius < RADII[RADII.length - 1] ? (
                  <button
                    type="button"
                    onClick={() => setRadius(10)}
                    className="press h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
                  >
                    Search within 10 km
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((h, i) => (
                <HelperRow
                  key={h.user.id}
                  helper={h}
                  index={i}
                  closest={i === 0 && sort === 'nearest' && list.length > 1}
                  onShowOnMap={() => {
                    setSelected(h.user.id)
                    setView('map')
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
