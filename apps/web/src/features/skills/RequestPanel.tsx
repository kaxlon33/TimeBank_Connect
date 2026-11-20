import { useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Loader2, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot, Skill } from '@/types'

const MIN = 0.5
const MAX = 4
const STEP = 0.5
const FLEXIBLE = ''

interface TimeOption {
  value: string
  day: string
  range: string
}

/** The helper's next three free times, so nobody has to type a date. */
function upcomingTimes(slots: AvailabilitySlot[]): TimeOption[] {
  const now = new Date()
  return slots
    .map((s) => {
      const [h, m] = s.start_time.split(':').map(Number)
      const d = new Date(now)
      d.setHours(h, m, 0, 0)
      let add = (s.weekday - d.getDay() + 7) % 7
      if (add === 0 && d <= now) add = 7
      d.setDate(d.getDate() + add)
      return { date: d, slot: s }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3)
    .map(({ date, slot }) => ({
      value: date.toISOString(),
      day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      range: `${slot.start_time} – ${slot.end_time}`,
    }))
}

interface Props {
  skill: Skill
  slots: AvailabilitySlot[]
  balance: number
}

export function RequestPanel({ skill, slots, balance }: Props) {
  const id = useId()
  const [hours, setHours] = useState(1)
  const [when, setWhen] = useState(FLEXIBLE)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const times = useMemo(() => upcomingTimes(slots), [slots])
  const firstName = skill.user.name.split(' ')[0]
  const enough = balance >= hours
  const sending = status === 'sending'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!enough || sending) return
    setStatus('sending')
    setError(null)
    try {
      await api.createRequest(skill.id, hours, message.trim(), when || null)
      setStatus('sent')
      toast.success(`Request sent to ${firstName}`)
    } catch (err) {
      setStatus('idle')
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'sent') {
    return (
      <section aria-live="polite" className="tile-in rounded-[28px] border bg-card p-7 text-center shadow-card">
        <span className="motion-pop mx-auto grid size-16 place-items-center rounded-full bg-positive/12 text-positive">
          <Check className="size-8" strokeWidth={3} aria-hidden="true" />
        </span>
        <h2 className="font-heading mt-5 text-3xl font-bold tracking-[-0.03em]">Request sent</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          {firstName} will reply soon. Credits only move once you both confirm the session is done.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/requests"
            className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-wine-700 text-sm font-bold text-wine-on hover:bg-wine-600"
          >
            View my requests
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to="/" className="press flex h-12 items-center justify-center rounded-2xl border text-sm font-bold hover:bg-secondary">
            Keep browsing
          </Link>
        </div>
      </section>
    )
  }

  const options: TimeOption[] = [
    ...times,
    { value: FLEXIBLE, day: 'I’m flexible', range: `Agree a time with ${firstName}` },
  ]

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
      <h2 className="font-heading text-[28px] leading-none font-bold tracking-[-0.03em]">Request help</h2>

      <div className="mt-6 space-y-6">
        {/* 1. How long */}
        <div>
          <p id={`${id}-hours`} className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
            1 · How long
          </p>
          <div
            role="group"
            aria-labelledby={`${id}-hours`}
            className="mt-2.5 flex h-[60px] items-center justify-between rounded-2xl bg-muted p-1.5"
          >
            <button
              type="button"
              aria-label="Shorter session"
              disabled={hours <= MIN}
              onClick={() => setHours((h) => Math.max(MIN, h - STEP))}
              className="press grid size-12 place-items-center rounded-xl bg-card shadow-card transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Minus className="size-[18px]" aria-hidden="true" />
            </button>
            <p aria-live="polite" className="flex items-baseline gap-1.5">
              <span className="numeral text-[34px]">{formatCredits(hours)}</span>
              <span className="text-sm font-bold text-muted-foreground">{hours === 1 ? 'hour' : 'hours'}</span>
            </p>
            <button
              type="button"
              aria-label="Longer session"
              disabled={hours >= MAX}
              onClick={() => setHours((h) => Math.min(MAX, h + STEP))}
              className="press grid size-12 place-items-center rounded-xl bg-wine-700 text-wine-on transition-colors hover:bg-wine-600 disabled:opacity-40"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 2. When */}
        <div>
          <p id={`${id}-when`} className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
            2 · When
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-when`} className="mt-2.5 space-y-2">
            {options.map((o) => {
              const on = when === o.value
              return (
                <button
                  key={o.value || 'flexible'}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setWhen(o.value)}
                  className={cn(
                    'press flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-colors duration-200',
                    on ? 'border-wine-700 bg-primary-soft' : 'bg-card hover:bg-muted',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                      on ? 'border-wine-700' : 'border-stone-200',
                    )}
                  >
                    <span className={cn('size-2.5 rounded-full bg-wine-700 transition-transform duration-200', on ? 'scale-100' : 'scale-0')} />
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-bold">{o.day}</span>
                    <span className="text-xs text-muted-foreground">{o.range}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Message */}
        <div>
          <label
            htmlFor={`${id}-message`}
            className="flex items-baseline justify-between text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase"
          >
            <span>3 · Message</span>
            <span className="font-medium tracking-normal normal-case">{message.length}/300</span>
          </label>
          <textarea
            id={`${id}-message`}
            value={message}
            maxLength={300}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${firstName}, I’d love some help with…`}
            className="mt-2.5 w-full resize-none rounded-2xl border border-input bg-card p-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div
        role="status"
        className={cn(
          'mt-6 flex items-center justify-between gap-3 border-t pt-5 text-sm',
          enough ? 'text-foreground' : 'text-negative',
        )}
      >
        <span className="font-bold">
          {enough
            ? `Total · ${formatCredits(hours)} ${hours === 1 ? 'credit' : 'credits'}`
            : `You need ${formatCredits(hours)} credits`}
        </span>
        <span className="font-medium text-muted-foreground">You have {formatCredits(balance)}</span>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-negative">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!enough || sending}
        className="press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-wine-700 text-[15px] font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            Send request
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </>
        )}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">You only pay when the session is done.</p>
    </form>
  )
}
