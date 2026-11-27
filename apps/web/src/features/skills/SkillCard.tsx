import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, Heart, MapPin, Star } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { staggerDelay } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { whereLabel } from '@/lib/where'
import { cn } from '@/lib/utils'
import type { Skill } from '@/types'

interface Props {
  skill: Skill
  distance: number | null
  index: number
  saved: boolean
  onToggleSave: (id: number) => void
  featured?: boolean
  /** The signed-in member's own skill: labelled "Yours", with no save heart. */
  mine?: boolean
}

function YoursChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-white shadow-raised ring-2 ring-white/80">
      <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
      Yours
    </span>
  )
}

function Rating({ skill, className }: { skill: Skill; className?: string }) {
  const { rating_avg, rating_count } = skill.user
  if (!rating_avg) {
    return <span className={cn('text-xs font-semibold', className)}>New helper</span>
  }
  return (
    <span className={cn('flex items-center gap-1 text-sm font-bold', className)}>
      <Star className="size-3.5 fill-brass-ink text-brass-ink" aria-hidden="true" />
      {rating_avg.toFixed(1)}
      <span className="font-medium opacity-70">({rating_count})</span>
    </span>
  )
}

function CategoryChip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/25 bg-wine-900/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
      {children}
    </span>
  )
}

function SaveButton({ skill, saved, onToggleSave }: Pick<Props, 'skill' | 'saved' | 'onToggleSave'>) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${skill.title} from saved` : `Save ${skill.title}`}
      onClick={() => onToggleSave(skill.id)}
      className="press relative z-10 grid size-11 place-items-center rounded-full bg-white/92 text-wine-700 shadow-card transition-transform duration-200 hover:scale-105"
    >
      <Heart className={cn('size-[18px] transition-colors', saved && 'fill-negative text-negative')} aria-hidden="true" />
    </button>
  )
}

export function SkillCard({ skill, distance, index, saved, onToggleSave, featured = false, mine = false }: Props) {
  const style = { '--delay': staggerDelay(index) } as CSSProperties
  const image = skillImage(skill)
  const where = whereLabel(skill.user.area, distance)

  if (featured) {
    return (
      <article
        style={style}
        className="tile-in group relative isolate flex min-h-[380px] flex-col justify-end overflow-hidden rounded-[28px] bg-wine-800 text-white shadow-raised transition-transform duration-300 ease-out hover:-translate-y-1 sm:col-span-2 sm:min-h-[460px] lg:min-h-0"
      >
        <img
          src={image}
          alt=""
          width={960}
          height={720}
          className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/95 via-wine-900/45 to-transparent" />

        <div className="absolute top-5 right-5 left-5 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip>{skill.category.name}</CategoryChip>
            {mine ? <YoursChip /> : null}
            <span className="flex items-center gap-1.5 rounded-full bg-brass px-3 py-1.5 text-xs font-bold text-wine-900">
              <Star className="size-3.5 fill-wine-900" aria-hidden="true" />
              Top rated near you
            </span>
          </div>
          {mine ? null : <SaveButton skill={skill} saved={saved} onToggleSave={onToggleSave} />}
        </div>

        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <h3 className="font-heading max-w-xl text-[clamp(2rem,4.2vw,3rem)] leading-[0.98] font-bold tracking-[-0.04em] text-balance">
            <Link to={`/skills/${skill.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
              {skill.title}
            </Link>
          </h3>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={skill.user.name} size={48} className="ring-2 ring-white/30" />
              <div>
                <p className="text-[15px] font-bold">{skill.user.name}</p>
                <p className="flex items-center gap-1 text-[13px] text-wine-on-muted">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {where}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="numeral text-[44px] text-white">{Math.round(skill.user.trust_score)}</p>
                <p className="mt-1 text-[11px] font-semibold text-wine-on-muted">trust score</p>
              </div>
              <span className="flex h-12 items-center gap-2 rounded-2xl bg-stone-50 px-5 text-sm font-bold text-wine-700">
                {mine ? 'View your skill' : 'Request help'}
                <ArrowUpRight className="nudge size-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      style={style}
      className="tile-in group relative flex flex-col overflow-hidden rounded-[28px] border bg-card shadow-card transition duration-300 ease-out hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-wine-800">
        <img
          src={image}
          alt=""
          width={960}
          height={720}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute top-3.5 right-3.5 left-3.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip>{skill.category.name}</CategoryChip>
            {mine ? <YoursChip /> : null}
          </div>
          {mine ? null : <SaveButton skill={skill} saved={saved} onToggleSave={onToggleSave} />}
        </div>
        <span className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 rounded-full bg-brass px-3 py-1.5 text-xs font-bold text-wine-900 shadow-card">
          <Clock className="size-3.5" aria-hidden="true" />1 h
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 p-5">
        <h3 className="font-heading text-[22px] leading-[1.08] font-bold tracking-[-0.03em] text-balance">
          <Link to={`/skills/${skill.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {skill.title}
          </Link>
        </h3>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={skill.user.name} size={38} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{skill.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{where}</p>
            </div>
          </div>
          <Rating skill={skill} className="shrink-0" />
        </div>
      </div>
    </article>
  )
}

export function SkillCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'overflow-hidden rounded-[28px] border bg-card',
        featured ? 'min-h-[380px] sm:col-span-2 sm:min-h-[460px] lg:min-h-0' : 'min-h-[360px]',
      )}
    >
      <div className={cn('skeleton-shimmer', featured ? 'h-full min-h-[380px]' : 'aspect-[4/3]')} />
      {featured ? null : (
        <div className="space-y-4 p-5">
          <div className="skeleton-shimmer h-6 w-4/5 rounded-lg" />
          <div className="flex items-center gap-2.5">
            <div className="skeleton-shimmer size-9 rounded-full" />
            <div className="skeleton-shimmer h-4 w-28 rounded-md" />
          </div>
        </div>
      )}
    </div>
  )
}
