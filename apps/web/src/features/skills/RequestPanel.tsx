import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, Loader2, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { formatCredits } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Skill } from '@/types'

const MIN = 0.5
const MAX = 4
const STEP = 0.5

/** Local time in the format a datetime-local input expects. */
function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

interface Props {
  skill: Skill
  balance: number
}

export function RequestPanel({ skill, balance }: Props) {
  const id = useId()
  const [hours, setHours] = useState(1)
  const [when, setWhen] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const firstName = skill.user.name.split(' ')[0]
  const enough = balance >= hours
  const sending = status === 'sending'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!enough || sending) return
    setStatus('sending')
    setError(null)
    try {
      await api.createRequest(skill.id, hours, message.trim(), when ? new Date(when).toISOString() : null)
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

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[28px] border bg-card p-6 shadow-card sm:p-7">
      <h2 className="font-heading text-[28px] leading-none font-bold tracking-[-0.03em]">Request help</h2>
      <p className="mt-2 text-sm text-muted-foreground">Ask {firstName} for a session. You only pay when it’s done.</p>

      <div className="mt-6">
        <p id={`${id}-hours`} className="text-sm font-bold">
          How long?
        </p>
        <div
          role="group"
          aria-labelledby={`${id}-hours`}
          className="mt-2 flex h-[60px] items-center justify-between rounded-2xl border bg-muted p-1.5"
        >
          <button
            type="button"
            aria-label="Shorter session"
            disabled={hours <= MIN}
            onClick={() => setHours((h) => Math.max(MIN, h - STEP))}
            className="press grid size-12 place-items-center rounded-xl border bg-card transition-colors hover:bg-secondary disabled:opacity-40"
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

      <div className="mt-5">
        <label htmlFor={`${id}-when`} className="text-sm font-bold">
          When? <span className="font-medium text-muted-foreground">(optional)</span>
        </label>
        <div className="relative mt-2">
          <CalendarDays
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id={`${id}-when`}
            type="datetime-local"
            value={when}
            min={localNow()}
            onChange={(e) => setWhen(e.target.value)}
            className="h-[52px] w-full rounded-2xl border border-input bg-card pr-4 pl-12 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor={`${id}-message`} className="flex items-baseline justify-between text-sm font-bold">
          <span>
            Message <span className="font-medium text-muted-foreground">(optional)</span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">{message.length}/300</span>
        </label>
        <textarea
          id={`${id}-message`}
          value={message}
          maxLength={300}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi ${firstName}, I’d love some help with…`}
          className="mt-2 w-full resize-none rounded-2xl border border-input bg-card p-4 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <p
        role="status"
        className={cn(
          'mt-5 flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold',
          enough ? 'bg-primary-soft text-wine-700' : 'bg-negative/10 text-negative',
        )}
      >
        <span>
          {enough
            ? `Costs ${formatCredits(hours)} ${hours === 1 ? 'credit' : 'credits'}`
            : `You need ${formatCredits(hours)} credits`}
        </span>
        <span className="font-medium">You have {formatCredits(balance)}</span>
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-negative">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!enough || sending}
        className="press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-wine-700 text-[15px] font-bold text-wine-on transition-colors hover:bg-wine-600 disabled:cursor-not-allowed disabled:opacity-50"
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
    </form>
  )
}
