import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  ArrowUpDown,
  ChefHat,
  Dumbbell,
  GraduationCap,
  HeartHandshake,
  LayoutGrid,
  MapPin,
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
import { FilterMenu } from '@/components/FilterMenu'
import { SkillCard, SkillCardSkeleton } from '@/features/skills/SkillCard'
import { api, sessionStore } from '@/lib/api'
import { distanceKm } from '@/lib/format'
import { useAsync, useDebouncedValue } from '@/lib/hooks'
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

/** Short names so every category fits on one line. */
const categoryLabels: Record<string, string> = {
  'home-and-garden': 'Garden',
  'repairs-and-diy': 'Repairs',
  'tech-help': 'Tech',
  'tutoring-and-languages': 'Learning',
  'cooking-and-baking': 'Cooking',
  'care-and-companionship': 'Care',
  'transport-and-errands': 'Errands',
  'arts-crafts-and-music': 'Arts',
  'health-and-fitness': 'Fitness',
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

/** Plain text tab with an underline that slides in: quiet, tidy and easy to scan. */
function CategoryTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="group relative flex h-12 shrink-0 items-center gap-2 px-4 text-sm font-bold text-muted-foreground transition-colors duration-200 outline-none first:pl-0 hover:text-foreground focus-visible:text-foreground aria-pressed:text-foreground"
    >
      <Icon
        className="size-[18px] transition-colors duration-200 group-aria-pressed:text-wine-700"
        aria-hidden="true"
      />
      {children}
      <span
        aria-hidden="true"
        className="absolute inset-x-4 -bottom-px h-[3px] origin-left scale-x-0 rounded-full bg-wine-700 transition-transform duration-300 ease-out group-first:inset-x-0 group-first:left-0 group-aria-pressed:scale-x-100"
      />
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
  const results = useAsync(
    (signal) => api.searchSkills({ q: query, category: category || undefined }, signal),
    `${query}|${category}`,
  )

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
      <header className="tile-in pt-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {greeting()}, {me.name.split(' ')[0]}
          {me.area ? ` · helpers near ${me.area.name}` : ''}
        </p>
        <h1 className="font-heading mt-2 text-[clamp(2.2rem,5.2vw,3.75rem)] leading-[0.98] font-bold tracking-[-0.045em] text-balance">
          What do you need a <span className="text-wine-700">hand</span> with?
        </h1>
      </header>

      {/* One bar for search and both filters. */}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="tile-in mt-7 flex flex-col gap-2 rounded-[28px] border bg-card p-2 shadow-raised lg:flex-row lg:items-center"
        style={{ '--delay': '60ms' } as React.CSSProperties}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-1 pl-4">
          <Search className="size-5 shrink-0 text-wine-700" aria-hidden="true" />
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
              className="press grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-1 border-t pt-2 lg:flex lg:gap-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-2">
          <FilterMenu
            variant="bar"
            label="Distance"
            icon={MapPin}
            value={radius}
            onChange={setRadius}
            options={[
              { value: 'any', label: 'Any distance', hint: 'Show everyone' },
              { value: '3', label: 'Within 3 km', hint: 'A short walk' },
              { value: '10', label: 'Within 10 km', hint: 'A short ride' },
            ]}
          />
          <FilterMenu
            variant="bar"
            label="Sort by"
            icon={ArrowUpDown}
            value={sort}
            onChange={setSort}
            options={[
              { value: 'match', label: 'Best match', hint: 'Trusted and nearby first' },
              { value: 'nearest', label: 'Nearest', hint: 'Closest helpers first' },
              { value: 'rated', label: 'Top rated', hint: 'Highest reviews first' },
            ]}
          />
        </div>
      </form>

      {/* Categories as quiet tabs, with the result count on the same line. */}
      <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div
          role="group"
          aria-label="Categories"
          className="-mx-4 flex min-w-0 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-1 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <CategoryTab active={category === ''} onClick={() => setCategory('')} icon={LayoutGrid}>
            All
          </CategoryTab>
          {categories.status === 'success'
            ? categories.data
                .filter((c) => c.is_active)
                .map((c) => (
                  <CategoryTab
                    key={c.id}
                    active={category === c.slug}
                    onClick={() => setCategory(category === c.slug ? '' : c.slug)}
                    icon={categoryIcons[c.slug] ?? LayoutGrid}
                  >
                    {categoryLabels[c.slug] ?? c.name}
                  </CategoryTab>
                ))
            : Array.from({ length: 6 }, (_, i) => (
                <span key={i} aria-hidden="true" className="skeleton-shimmer my-3 mr-4 h-6 w-20 shrink-0 rounded-md" />
              ))}
        </div>
        <p aria-live="polite" className="shrink-0 pt-3 text-sm font-semibold text-muted-foreground lg:pt-0 lg:pb-3">
          {results.status === 'success'
            ? `${items.length} ${items.length === 1 ? 'skill' : 'skills'} ${filtersActive ? 'found' : 'near you'}`
            : results.status === 'error'
              ? ''
              : 'Finding skills…'}
        </p>
      </div>

      <div className="mt-6">
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
    </div>
  )
}
