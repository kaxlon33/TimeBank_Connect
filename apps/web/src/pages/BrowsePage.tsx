import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  ChefHat,
  ChevronDown,
  Dumbbell,
  GraduationCap,
  HeartHandshake,
  LayoutGrid,
  Music,
  Search,
  SearchX,
  Smartphone,
  Sprout,
  Truck,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { SkillCard, SkillCardSkeleton } from '@/features/skills/SkillCard'
import { api, sessionStore } from '@/lib/api'
import { distanceKm } from '@/lib/format'
import { useAsync, useDebouncedValue } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { Skill } from '@/types'

const categoryIcons: Record<string, LucideIcon> = {
  'home-and-garden': Sprout,
  'repairs-and-diy': Wrench,
  'tech-help': Smartphone,
  'tutoring-and-languages': GraduationCap,
  'cooking-and-baking': ChefHat,
  'care-and-companionship': HeartHandshake,
  'transport-and-errands': Truck,
  'arts-crafts-and-music': Music,
  'health-and-fitness': Dumbbell,
}

type Radius = 'any' | '3' | '10'
type Sort = 'match' | 'nearest' | 'rated'

interface Item {
  skill: Skill
  distance: number | null
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 cursor-pointer appearance-none rounded-full border bg-card py-0 pr-10 pl-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-muted-foreground" aria-hidden="true" />
    </label>
  )
}

function Chip({
  active,
  onClick,
  icon: Icon,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  count?: number
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors duration-200',
        active ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-primary-soft',
      )}
    >
      <Icon className={cn('size-4', active ? 'text-brass' : 'text-wine-700')} aria-hidden="true" />
      {children}
      {count !== undefined ? (
        <span className={cn('text-xs', active ? 'text-brass' : 'text-muted-foreground')}>{count}</span>
      ) : null}
    </button>
  )
}

export function BrowsePage() {
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [radius, setRadius] = useState<Radius>('any')
  const [sort, setSort] = useState<Sort>('match')
  const [saved, setSaved] = useState<Set<number>>(new Set())

  const query = useDebouncedValue(text.trim(), 300)
  const categories = useAsync(() => api.getCategories(), 'categories')
  const results = useAsync((signal) => api.searchSkills({ q: query, category: category || undefined }, signal), `${query}|${category}`)

  const data = results.status === 'success' ? results.data : null
  const items = useMemo<Item[]>(() => {
    if (!data) return []
    const here = me.area
    let list = data.map<Item>((skill) => ({
      skill,
      distance:
        here && skill.user.area
          ? distanceKm(here.latitude, here.longitude, skill.user.area.latitude, skill.user.area.longitude)
          : null,
    }))
    if (radius !== 'any') list = list.filter((i) => i.distance !== null && i.distance <= Number(radius))
    if (sort === 'nearest') list.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
    if (sort === 'rated') list.sort((a, b) => (b.skill.user.rating_avg ?? 0) - (a.skill.user.rating_avg ?? 0))
    return list
  }, [data, me.area, radius, sort])

  const featured = !query && !category && radius === 'any' && sort === 'match' && items.length >= 3 ? items[0] : null
  const rest = featured ? items.slice(1) : items
  const filtersActive = Boolean(query || category || radius !== 'any' || sort !== 'match')

  const toggleSave = (id: number) =>
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const clearAll = () => {
    setText('')
    setCategory('')
    setRadius('any')
    setSort('match')
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="flex flex-col gap-6 pt-2 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="tile-in max-w-3xl">
          <p className="text-sm font-semibold text-muted-foreground">
            {greeting()}, {me.name.split(' ')[0]}
            {me.area ? ` · helpers near ${me.area.name}` : ''}
          </p>
          <h1 className="font-heading mt-2 text-[clamp(2.2rem,5.2vw,3.75rem)] leading-[0.98] font-bold tracking-[-0.045em] text-balance">
            What do you need a <span className="text-wine-700">hand</span> with?
          </h1>
        </div>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="tile-in flex w-full items-center gap-2 rounded-[22px] border border-input bg-card p-2 pl-5 shadow-raised lg:max-w-[540px]"
          style={{ '--delay': '60ms' } as React.CSSProperties}
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="skill-search" className="sr-only">
            Search skills, helpers or areas
          </label>
          <input
            id="skill-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Try “bike repair”, “French” or “yoga”"
            autoComplete="off"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {text ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setText('')}
              className="press grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="submit"
            className="press h-12 shrink-0 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Search
          </button>
        </form>
      </header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Categories"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <Chip active={category === ''} onClick={() => setCategory('')} icon={LayoutGrid}>
            All
          </Chip>
          {categories.status === 'success'
            ? categories.data
                .filter((c) => c.is_active)
                .map((c) => (
                  <Chip
                    key={c.id}
                    active={category === c.slug}
                    onClick={() => setCategory(category === c.slug ? '' : c.slug)}
                    icon={categoryIcons[c.slug] ?? LayoutGrid}
                  >
                    {c.name}
                  </Chip>
                ))
            : Array.from({ length: 5 }, (_, i) => (
                <span key={i} aria-hidden="true" className="skeleton-shimmer h-11 w-28 shrink-0 rounded-full" />
              ))}
        </div>

        <div className="flex gap-2">
          <Select
            label="Distance"
            value={radius}
            onChange={setRadius}
            options={[
              { value: 'any', label: 'Any distance' },
              { value: '3', label: 'Within 3 km' },
              { value: '10', label: 'Within 10 km' },
            ]}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'match', label: 'Best match' },
              { value: 'nearest', label: 'Nearest' },
              { value: 'rated', label: 'Top rated' },
            ]}
          />
        </div>
      </div>

      <p aria-live="polite" className="mt-6 mb-4 text-sm font-semibold text-muted-foreground">
        {results.status === 'success'
          ? `${items.length} ${items.length === 1 ? 'skill' : 'skills'} ${filtersActive ? 'found' : 'offered by your neighbours'}`
          : results.status === 'error'
            ? ''
            : 'Finding skills…'}
      </p>

      {results.status === 'loading' ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          <SkillCardSkeleton featured />
          {Array.from({ length: 6 }, (_, i) => (
            <SkillCardSkeleton key={i} />
          ))}
        </div>
      ) : results.status === 'error' ? (
        <div role="alert" className="rounded-[28px] border bg-card p-10 text-center">
          <p className="font-heading text-2xl font-bold tracking-[-0.03em]">We couldn’t load skills</p>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{results.error.message}</p>
          <button
            type="button"
            onClick={results.reload}
            className="press mt-6 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border bg-card p-10 text-center sm:p-16">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
            <SearchX className="size-7" aria-hidden="true" />
          </span>
          <p className="font-heading mt-5 text-3xl font-bold tracking-[-0.03em]">No skills match yet</p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Try a shorter word, another category or a wider distance. You could also post the skill you need.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="press mt-6 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured ? (
            <SkillCard
              featured
              skill={featured.skill}
              distance={featured.distance}
              index={0}
              saved={saved.has(featured.skill.id)}
              onToggleSave={toggleSave}
            />
          ) : null}
          {rest.map((item, i) => (
            <SkillCard
              key={item.skill.id}
              skill={item.skill}
              distance={item.distance}
              index={i + (featured ? 1 : 0)}
              saved={saved.has(item.skill.id)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
