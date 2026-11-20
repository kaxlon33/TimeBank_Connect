import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Coins, Gauge, Loader2, MapPin, Minus, Plus, RotateCcw, Users, Wand2, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader } from '@/features/admin/AdminShell'
import { api, ApiError } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { staggerDelay, useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AppSettings, MatchingWeights } from '@/types'

const weightMeta: { key: keyof MatchingWeights; label: string; hint: string; dot: string }[] = [
  { key: 'skill', label: 'Skill match', hint: 'How well the skill fits the request', dot: 'bg-wine-700' },
  { key: 'location', label: 'Distance', hint: 'How close the helper lives', dot: 'bg-wine-500' },
  { key: 'availability', label: 'Availability', hint: 'Free at the time asked for', dot: 'bg-brass' },
  { key: 'reputation', label: 'Reputation', hint: 'Ratings and trust score', dot: 'bg-brass-ink' },
]

/** A small  −  value  +  control. */
function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
  size = 'md',
}: {
  label: string
  value: number
  unit?: string
  step: number
  min: number
  max: number
  onChange: (v: number) => void
  size?: 'md' | 'sm'
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10))
  const btn = size === 'md' ? 'size-11' : 'size-9'
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className={cn('press grid shrink-0 place-items-center rounded-xl border bg-card hover:bg-secondary disabled:opacity-40', btn)}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <p className="flex items-baseline gap-1" aria-live="polite">
        <span className={cn('numeral text-wine-700', size === 'md' ? 'text-[40px]' : 'text-[30px]')}>{formatCredits(value)}</span>
        {unit ? <span className="text-xs font-bold text-muted-foreground">{unit}</span> : null}
      </p>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className={cn(
          'press grid shrink-0 place-items-center rounded-xl bg-wine-700 text-wine-on hover:bg-wine-600 disabled:opacity-40',
          btn,
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function Setting({
  icon: Icon,
  title,
  hint,
  index,
  children,
}: {
  icon: LucideIcon
  title: string
  hint: string
  index: number
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      style={{ '--delay': staggerDelay(index) } as CSSProperties}
      className="tile-in flex flex-col justify-between gap-5 rounded-[26px] border bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-wine-700">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[15px] leading-tight font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

/** Scales the four weights so they add up to exactly 100, keeping their proportions. */
function balance(w: MatchingWeights): MatchingWeights {
  const keys = Object.keys(w) as (keyof MatchingWeights)[]
  const total = keys.reduce((s, k) => s + w[k], 0)
  if (total === 0) return { skill: 25, location: 25, availability: 25, reputation: 25 }
  const next = { ...w }
  keys.forEach((k) => {
    next[k] = Math.round((w[k] * 100) / total)
  })
  const diff = 100 - keys.reduce((s, k) => s + next[k], 0)
  const biggest = keys.reduce((a, b) => (next[a] >= next[b] ? a : b))
  next[biggest] += diff
  return next
}

export function AdminSettingsPage() {
  const loaded = useAsync(() => api.getSettings(), 'admin-settings')
  const [saved, setSaved] = useState<AppSettings | null>(null)
  const [form, setForm] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)

  // Copy the loaded settings into the form once, when they arrive. The form is then the admin's to edit.
  const data = loaded.status === 'success' ? loaded.data : null
  useEffect(() => {
    if (data) {
      setSaved(data)
      setForm(data)
    }
  }, [data])

  const dirty = form !== null && saved !== null && JSON.stringify(form) !== JSON.stringify(saved)
  const total = form ? Object.values(form.matching.weights).reduce((a, b) => a + b, 0) : 100
  const balanced = total === 100

  const setMatching = (patch: Partial<AppSettings['matching']>) => setForm((f) => (f ? { ...f, matching: { ...f.matching, ...patch } } : f))
  const setWeight = (key: keyof MatchingWeights, value: number) =>
    setForm((f) => (f ? { ...f, matching: { ...f.matching, weights: { ...f.matching.weights, [key]: value } } } : f))

  async function save() {
    if (!form || !balanced) return
    setBusy(true)
    try {
      const next = await api.saveSettings(form)
      setSaved(next)
      setForm(next)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not save the settings. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <AdminHeader kicker="Rules for credits and matching" title="Settings" />

      {!form ? (
        loaded.status === 'error' ? (
          <div role="alert" className="rounded-[28px] border bg-card p-10 text-center">
            <p className="font-heading text-2xl font-bold">We couldn’t load the settings</p>
            <button
              type="button"
              onClick={loaded.reload}
              className="press mt-5 h-11 rounded-2xl bg-wine-700 px-5 text-sm font-bold text-wine-on hover:bg-wine-600"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-6" aria-busy="true">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton-shimmer h-[170px] rounded-[26px]" />
              ))}
            </div>
            <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Setting icon={Coins} index={0} title="Starter credit" hint="Given to every new member when they join. New members only.">
              <Stepper
                label="Starter credit"
                value={form.starter_credit}
                unit="hours"
                step={0.5}
                min={0}
                max={10}
                onChange={(v) => setForm({ ...form, starter_credit: v })}
              />
            </Setting>
            <Setting icon={MapPin} index={1} title="Maximum distance" hint="Helpers further away than this are not suggested.">
              <Stepper
                label="Maximum distance"
                value={form.matching.max_distance_km}
                unit="km"
                step={1}
                min={1}
                max={50}
                onChange={(v) => setMatching({ max_distance_km: v })}
              />
            </Setting>
            <Setting icon={Gauge} index={2} title="Minimum match score" hint="Helpers scoring below this are left out. Out of 100.">
              <Stepper
                label="Minimum match score"
                value={form.matching.min_score}
                step={5}
                min={0}
                max={100}
                onChange={(v) => setMatching({ min_score: v })}
              />
            </Setting>
            <Setting icon={Users} index={3} title="Helpers shown" hint="How many suggestions a member sees per request.">
              <Stepper
                label="Helpers shown"
                value={form.matching.max_results}
                unit="helpers"
                step={1}
                min={1}
                max={20}
                onChange={(v) => setMatching({ max_results: v })}
              />
            </Setting>
          </div>

          <section
            aria-labelledby="match-title"
            style={{ '--delay': '240ms' } as CSSProperties}
            className="tile-in rounded-[28px] border bg-card p-5 shadow-card sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="match-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
                  Matching weights
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">How suggested helpers are ranked. The four must add up to 100%.</p>
              </div>
              <div className="flex items-center gap-2">
                {!balanced ? (
                  <button
                    type="button"
                    onClick={() => setMatching({ weights: balance(form.matching.weights) })}
                    className="press flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-bold hover:bg-secondary"
                  >
                    <Wand2 className="size-4" aria-hidden="true" />
                    Balance to 100%
                  </button>
                ) : null}
                <span
                  role="status"
                  className={cn(
                    'flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold',
                    balanced ? 'bg-status-completed-bg text-status-completed' : 'bg-status-declined-bg text-status-declined',
                  )}
                >
                  {balanced ? <Check className="size-4" aria-hidden="true" /> : null}
                  {balanced ? 'Total 100%' : `Total ${total}%`}
                </span>
              </div>
            </div>

            <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {weightMeta.map((w) => (
                <div
                  key={w.key}
                  className={cn('h-full transition-[width] duration-300', w.dot)}
                  style={{ width: `${(form.matching.weights[w.key] / Math.max(total, 100)) * 100}%` }}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {weightMeta.map((w) => (
                <div key={w.key} className="rounded-[20px] bg-muted/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <span className={cn('size-2.5 rounded-sm', w.dot)} aria-hidden="true" />
                    {w.label}
                  </p>
                  <p className="mt-1 mb-3 text-xs text-muted-foreground">{w.hint}</p>
                  <Stepper
                    label={w.label}
                    value={form.matching.weights[w.key]}
                    unit="%"
                    step={5}
                    min={0}
                    max={100}
                    size="sm"
                    onChange={(v) => setWeight(w.key, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {dirty ? (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[24px] bg-wine-900 p-3 pl-5 text-white shadow-raised lg:left-[calc(272px+1rem)] lg:mx-auto lg:max-w-3xl">
          <p className="text-sm font-bold">{balanced ? 'You have unsaved changes' : 'The weights must total 100% to save'}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm(saved)}
              className="press flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold hover:bg-white/20"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">Undo</span>
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !balanced}
              className="press flex h-11 items-center gap-2 rounded-xl bg-brass px-5 text-sm font-bold text-wine-900 hover:bg-brass/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              Save settings
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
