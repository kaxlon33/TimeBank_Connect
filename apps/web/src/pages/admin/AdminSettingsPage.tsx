import { useEffect, useState } from 'react'
import { Check, Info, Loader2, Minus, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader } from '@/features/admin/AdminShell'
import { api, ApiError } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AppSettings, MatchingWeights } from '@/types'

const weightMeta: { key: keyof MatchingWeights; label: string; hint: string; bar: string }[] = [
  { key: 'skill', label: 'Skill match', hint: 'How well the skill fits the request', bar: 'bg-wine-700' },
  { key: 'location', label: 'Distance', hint: 'How close the helper lives', bar: 'bg-wine-500' },
  { key: 'availability', label: 'Availability', hint: 'Free at the time asked for', bar: 'bg-brass' },
  { key: 'reputation', label: 'Reputation', hint: 'Ratings and trust score', bar: 'bg-brass-ink' },
]

function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  unit: string
  step: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10))
  return (
    <div role="group" aria-label={label} className="flex h-20 items-center justify-between rounded-[22px] border bg-muted/60 px-2.5">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="press grid size-14 place-items-center rounded-2xl border bg-card hover:bg-secondary disabled:opacity-40"
      >
        <Minus className="size-5" aria-hidden="true" />
      </button>
      <p className="flex items-baseline gap-1.5" aria-live="polite">
        <span className="numeral text-[44px] text-wine-700">{formatCredits(value)}</span>
        <span className="text-sm font-bold text-muted-foreground">{unit}</span>
      </p>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="press grid size-14 place-items-center rounded-2xl bg-wine-700 text-wine-on hover:bg-wine-600 disabled:opacity-40"
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}

function Slider({
  id,
  label,
  hint,
  value,
  min = 0,
  max,
  suffix,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  value: number
  min?: number
  max: number
  suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
          {hint ? <span className="ml-2 text-xs font-medium text-muted-foreground">{hint}</span> : null}
        </label>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-wine-700">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-wine-700 [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-wine-700 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-card"
      />
    </div>
  )
}

export function AdminSettingsPage() {
  const loaded = useAsync(() => api.getSettings(), 'admin-settings')
  const [saved, setSaved] = useState<AppSettings | null>(null)
  const [form, setForm] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)

  // Copy the loaded settings into the form once, when they arrive. The form is then the member's to edit.
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

      {loaded.status === 'loading' || !form ? (
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" aria-busy="true">
            <div className="skeleton-shimmer h-72 rounded-[28px]" />
            <div className="skeleton-shimmer h-[520px] rounded-[28px]" />
          </div>
        )
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <section aria-labelledby="starter-title" className="tile-in rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
            <h2 id="starter-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
              Starter credit
            </h2>
            <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
              Time credits every new member gets when they join, so they can ask for help straight away.
            </p>
            <Stepper
              label="Starter credit"
              value={form.starter_credit}
              unit="hours"
              step={0.5}
              min={0}
              max={10}
              onChange={(v) => setForm({ ...form, starter_credit: v })}
            />
            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              Applies to new members only.
            </p>
          </section>

          <section
            aria-labelledby="match-title"
            className="tile-in rounded-[28px] border bg-card p-6 shadow-card sm:p-7"
            style={{ animationDelay: '80ms' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="match-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
                Matching weights
              </h2>
              <span
                role="status"
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
                  balanced ? 'bg-status-completed-bg text-status-completed' : 'bg-status-declined-bg text-status-declined',
                )}
              >
                {balanced ? <Check className="size-3.5" aria-hidden="true" /> : null}
                {balanced ? 'Total 100%' : `Total ${total}%: must be 100%`}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">How suggested helpers are ranked for each request.</p>

            <div className="mt-5 flex h-3.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {weightMeta.map((w) => (
                <div
                  key={w.key}
                  className={cn('h-full transition-[width] duration-300', w.bar)}
                  style={{ width: `${(form.matching.weights[w.key] / Math.max(total, 100)) * 100}%` }}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {weightMeta.map((w) => (
                <li key={w.key} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className={cn('size-2.5 rounded-sm', w.bar)} aria-hidden="true" />
                  {w.label} {form.matching.weights[w.key]}%
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-6">
              {weightMeta.map((w) => (
                <Slider
                  key={w.key}
                  id={`weight-${w.key}`}
                  label={w.label}
                  hint={w.hint}
                  value={form.matching.weights[w.key]}
                  max={100}
                  suffix="%"
                  onChange={(v) => setWeight(w.key, v)}
                />
              ))}
            </div>

            <hr className="my-7" />

            <div className="space-y-6">
              <Slider
                id="max-distance"
                label="Maximum distance"
                value={form.matching.max_distance_km}
                min={1}
                max={50}
                suffix=" km"
                onChange={(v) => setMatching({ max_distance_km: v })}
              />
              <Slider
                id="min-score"
                label="Minimum match score"
                value={form.matching.min_score}
                max={100}
                suffix=" / 100"
                onChange={(v) => setMatching({ min_score: v })}
              />
              <div>
                <p className="mb-2 text-sm font-bold">Helpers shown per request</p>
                <Stepper
                  label="Helpers shown"
                  value={form.matching.max_results}
                  unit="helpers"
                  step={1}
                  min={1}
                  max={20}
                  onChange={(v) => setMatching({ max_results: v })}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {dirty ? (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[24px] bg-wine-900 p-3 pl-5 text-white shadow-raised lg:left-[calc(272px+1rem)] lg:mx-auto lg:max-w-3xl">
          <p className="text-sm font-bold">{balanced ? 'You have unsaved changes' : 'Weights must total 100% to save'}</p>
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
