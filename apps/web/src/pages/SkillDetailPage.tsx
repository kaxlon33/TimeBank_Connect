import { useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Clock, Heart, SearchX } from 'lucide-react'
import { AvailabilityStrip } from '@/features/skills/AvailabilityStrip'
import { HelperCard } from '@/features/skills/HelperCard'
import { ReportButton } from '@/features/skills/ReportDialog'
import { RequestPanel } from '@/features/skills/RequestPanel'
import { ReviewsList } from '@/features/skills/ReviewsList'
import { SuggestedHelpers } from '@/features/skills/SuggestedHelpers'
import { api, sessionStore } from '@/lib/api'
import { distanceKm } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]" aria-busy="true" aria-label="Loading skill">
      <div className="skeleton-shimmer h-[280px] rounded-[32px] sm:h-[360px] lg:h-[420px]" />
      <div className="space-y-5 lg:row-span-3">
        <div className="skeleton-shimmer h-72 rounded-[28px]" />
        <div className="skeleton-shimmer h-[520px] rounded-[28px]" />
      </div>
      <div className="skeleton-shimmer h-56 rounded-[28px]" />
      <div className="skeleton-shimmer h-48 rounded-[28px]" />
    </div>
  )
}

export function SkillDetailPage() {
  const { id } = useParams()
  const { me } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
  const [saved, setSaved] = useState(false)
  const state = useAsync(() => api.getSkill(Number(id)), String(id))

  if (state.status === 'error') {
    return (
      <div className="mx-auto w-full max-w-xl px-4 pt-10 pb-32 text-center">
        <div role="alert" className="rounded-[28px] border bg-card p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
            <SearchX className="size-7" aria-hidden="true" />
          </span>
          <h1 className="font-heading mt-5 text-3xl font-bold tracking-[-0.03em]">Skill not found</h1>
          <p className="mt-2 text-muted-foreground">{state.error.message}</p>
          <Link
            to="/"
            className="press mt-6 inline-flex h-12 items-center rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            Back to browse
          </Link>
        </div>
      </div>
    )
  }

  const loaded = state.status === 'success' ? state.data : null
  const skill = loaded?.skill
  const helper = loaded?.helper
  const reviews = loaded ? [...loaded.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []
  const distance =
    me.area && helper?.area ? distanceKm(me.area.latitude, me.area.longitude, helper.area.latitude, helper.area.longitude) : null
  const mine = Boolean(skill && skill.user.id === me.id)
  const slots = helper ? [...helper.availability].sort((a, b) => a.weekday - b.weekday) : []

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Browse
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="truncate">{skill?.category.name ?? '…'}</span>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate text-foreground">{skill?.title ?? '…'}</span>
      </nav>

      {!skill || !helper ? (
        <DetailSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section
            aria-label={skill.title}
            className="tile-in relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[32px] bg-wine-800 text-white shadow-raised sm:min-h-[380px] lg:min-h-[440px]"
          >
            <img src={skillImage(skill)} alt="" width={960} height={720} className="absolute inset-0 -z-20 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/92 via-wine-900/35 to-transparent" />

            <div className="absolute top-5 right-5 left-5 flex items-start justify-between gap-3 sm:top-6 sm:right-6 sm:left-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/25 bg-wine-900/45 px-3.5 py-1.5 text-xs font-bold backdrop-blur-md">
                  {skill.category.name}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-wine-900/45 px-3.5 py-1.5 text-xs font-bold backdrop-blur-md">
                  <Clock className="size-3.5" aria-hidden="true" />1 credit per hour
                </span>
              </div>
              <button
                type="button"
                aria-pressed={saved}
                aria-label={saved ? 'Remove from saved' : 'Save this skill'}
                onClick={() => setSaved((s) => !s)}
                className="press grid size-11 shrink-0 place-items-center rounded-full bg-white/92 text-wine-700 shadow-card transition-transform duration-200 hover:scale-105"
              >
                <Heart className={cn('size-[18px]', saved && 'fill-wine-700')} aria-hidden="true" />
              </button>
            </div>

            <h1 className="font-heading max-w-3xl p-6 text-[clamp(2.2rem,5vw,3.75rem)] leading-[0.98] font-bold tracking-[-0.045em] text-balance sm:p-8">
              {skill.title}
            </h1>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
            <HelperCard helper={helper} distance={distance} />
            {mine ? (
              <section className="rounded-[28px] border bg-card p-7 text-center shadow-card">
                <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">This is your skill</h2>
                <p className="mt-2 text-sm text-muted-foreground">Neighbours can request it from the Browse page.</p>
                <Link
                  to="/my-skills"
                  className="press mt-5 inline-flex h-12 items-center rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
                >
                  Manage my skills
                </Link>
              </section>
            ) : (
              <>
                <RequestPanel skill={skill} slots={slots} balance={me.credit_balance} />
                <div className="flex justify-center">
                  <ReportButton kind="skill" targetId={skill.id} subject={skill.title} label="Report this skill" />
                </div>
              </>
            )}
          </aside>

          <section
            aria-label="Skill details"
            className="tile-in divide-y rounded-[28px] border bg-card shadow-card"
            style={{ '--delay': '60ms' } as React.CSSProperties}
          >
            <div className="p-6 sm:p-8">
              <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">About this skill</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{skill.description}</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">When {helper.name.split(' ')[0]} is free</h2>
                <p className="text-sm text-muted-foreground">Usual weekly hours</p>
              </div>
              {slots.length ? (
                <AvailabilityStrip slots={slots} />
              ) : (
                <p className="text-sm text-muted-foreground">No fixed times. Suggest one in your request.</p>
              )}
            </div>

            <div className="p-6 sm:p-8">
              <h2 className="font-heading mb-6 text-2xl font-bold tracking-[-0.03em]">What neighbours say</h2>
              <ReviewsList helper={helper} reviews={reviews} />
            </div>
          </section>

          {mine ? null : (
            <section className="tile-in rounded-[28px] border bg-card shadow-card" style={{ '--delay': '120ms' } as React.CSSProperties}>
              <SuggestedHelpers skillId={skill.id} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
