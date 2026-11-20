import type { ReactNode } from 'react'
import { ArrowLeft, CalendarDays, Check, Clock, Loader2, MapPin, Star, X } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { formatCredits, formatDate, relativeTime } from '@/lib/format'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'
import type { HelpRequest } from '@/types'
import { StatusTag } from './StatusTag'
import { otherParty, type Action, type Box } from './status'

interface Props {
  request: HelpRequest
  box: Box
  balance: number
  busy: Action | null
  error: string | null
  onAction: (action: Action) => void
  onReview: () => void
  onBack: () => void
}

function Step({ label, detail, state, last }: { label: string; detail: string; state: 'done' | 'current' | 'todo'; last: boolean }) {
  return (
    <li className="flex gap-3.5">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
            state === 'done' && 'bg-wine-700 text-wine-on',
            state === 'current' && 'bg-brass text-wine-900 ring-4 ring-brass/25',
            state === 'todo' && 'bg-stone-100 text-muted-foreground',
          )}
        >
          {state === 'done' ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : <Clock className="size-3.5" aria-hidden="true" />}
        </span>
        {last ? null : <span className={cn('my-1 w-0.5 flex-1 rounded-full', state === 'done' ? 'bg-wine-700' : 'bg-stone-200')} />}
      </div>
      <div className={cn('pb-5', last && 'pb-0')}>
        <p className={cn('text-[15px] leading-tight font-bold', state === 'todo' && 'text-muted-foreground')}>{label}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{detail}</p>
      </div>
    </li>
  )
}

function ActionButton({
  tone,
  busy,
  disabled,
  onClick,
  icon,
  children,
}: {
  tone: 'primary' | 'ghost'
  busy: boolean
  disabled: boolean
  onClick: () => void
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'press flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-bold whitespace-nowrap transition-colors disabled:opacity-60 sm:w-auto',
        tone === 'primary' ? 'bg-brass text-wine-900 hover:bg-brass/90 sm:min-w-52' : 'border border-white/30 bg-white/10 text-white hover:bg-white/20',
      )}
    >
      {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

export function RequestDetail({ request: r, box, balance, busy, error, onAction, onReview, onBack }: Props) {
  const other = otherParty(r, box)
  const first = other.name.split(' ')[0]
  const closed = r.status === 'declined' || r.status === 'cancelled'
  const isBusy = busy !== null

  const stamps = [
    { label: 'Requested', at: r.created_at },
    { label: 'Accepted', at: r.responded_at && r.status !== 'declined' ? r.responded_at : null },
    { label: 'Session done', at: r.provider_done_at },
    { label: 'Credits paid', at: r.completed_at },
  ]
  const currentIndex = stamps.findIndex((s) => !s.at)

  const btn = (action: Action, tone: 'primary' | 'ghost', label: string, icon?: ReactNode) => (
    <ActionButton tone={tone} busy={busy === action} disabled={isBusy} onClick={() => onAction(action)} icon={icon}>
      {busy === action ? 'Working…' : label}
    </ActionButton>
  )

  let actions: ReactNode = null
  let note: string | null = null
  if (box === 'received') {
    if (r.status === 'pending') {
      actions = (
        <>
          {btn('accept', 'primary', 'Accept request', <Check className="size-[18px]" aria-hidden="true" />)}
          {btn('decline', 'ghost', 'Decline', <X className="size-[18px]" aria-hidden="true" />)}
        </>
      )
      note = `Accept to start. You earn ${formatCredits(r.credits)} ${r.credits === 1 ? 'credit' : 'credits'} when ${first} confirms.`
    } else if (r.status === 'accepted') {
      actions = (
        <>
          {btn('mark_done', 'primary', 'Mark session done', <Check className="size-[18px]" aria-hidden="true" />)}
          {btn('cancel', 'ghost', 'Cancel')}
        </>
      )
      note = `Once you have helped ${first}, mark it done so they can confirm.`
    } else if (r.status === 'awaiting_confirmation') {
      note = `Waiting for ${first} to confirm. Your credits arrive as soon as they do.`
    }
  } else if (r.status === 'pending') {
    actions = btn('cancel', 'ghost', 'Cancel request')
    note = `Waiting for ${first} to reply.`
  } else if (r.status === 'accepted') {
    actions = btn('cancel', 'ghost', 'Cancel request')
    note = `${first} accepted. After your session they will mark it done and you confirm.`
  } else if (r.status === 'awaiting_confirmation') {
    actions = btn(
      'confirm',
      'primary',
      `Confirm and pay ${formatCredits(r.credits)} ${r.credits === 1 ? 'credit' : 'credits'}`,
      <Check className="size-[18px]" aria-hidden="true" />,
    )
    note = balance >= r.credits ? `${first} says the session is done.` : `You need ${formatCredits(r.credits)} credits to confirm. You have ${formatCredits(balance)}.`
  }
  if (r.status === 'completed' && !r.reviewed_by_me) {
    actions = (
      <ActionButton tone="primary" busy={false} disabled={false} onClick={onReview} icon={<Star className="size-[18px]" aria-hidden="true" />}>
        Leave a review
      </ActionButton>
    )
    note = `Tell others how it went with ${first}.`
  }

  return (
    <article aria-label={`Request for ${r.skill.title}`} className="tile-in overflow-hidden rounded-[28px] border bg-card shadow-card">
      <div className="relative isolate flex h-48 flex-col justify-end overflow-hidden bg-wine-800 text-white sm:h-56">
        <img src={skillImage(r.skill)} alt="" width={960} height={720} className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-900/92 via-wine-900/40 to-transparent" />
        <div className="absolute top-4 right-4 left-4 flex items-center justify-between gap-3 sm:top-5 sm:right-6 sm:left-6">
          <button
            type="button"
            onClick={onBack}
            className="press flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-wine-900/45 pr-4 pl-3 text-sm font-bold backdrop-blur-md lg:hidden"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All requests
          </button>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-white/25 bg-wine-900/45 px-3.5 py-2 text-xs font-bold backdrop-blur-md">
            <Clock className="size-3.5" aria-hidden="true" />
            Sent {relativeTime(r.created_at)}
          </span>
        </div>
        <div className="flex items-end justify-between gap-4 p-5 sm:px-8 sm:pb-6">
          <h2 className="font-heading text-[clamp(1.6rem,3.2vw,2.25rem)] leading-[1.02] font-bold tracking-[-0.04em] text-balance">
            {r.skill.title}
          </h2>
          <StatusTag request={r} box={box} className="shrink-0" />
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-primary-soft p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-wine-700 uppercase">
                <Clock className="size-3.5" aria-hidden="true" />
                Length
              </dt>
              <dd className="mt-2 flex items-baseline gap-1.5">
                <span className="numeral text-[44px] text-wine-700">{formatCredits(r.hours)}</span>
                <span className="text-sm font-bold text-wine-700">{r.hours === 1 ? 'hour' : 'hours'}</span>
              </dd>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                When
              </dt>
              <dd className="mt-2 text-[15px] leading-snug font-bold">
                {r.proposed_at
                  ? new Date(r.proposed_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Time to be agreed'}
              </dd>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                <MapPin className="size-3.5" aria-hidden="true" />
                {box === 'received' ? 'Requested by' : 'Helper'}
              </dt>
              <dd className="mt-2 text-[15px] leading-snug font-bold">
                {other.name}
                {other.area ? <span className="block text-[13px] font-medium text-muted-foreground">{other.area.name}</span> : null}
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-3">
            <Avatar name={r.requester.name} src={r.requester.avatar_url} size={40} />
            <p
              className={cn(
                'flex-1 rounded-2xl rounded-tl-md border bg-card px-5 py-4 text-[15px] leading-relaxed',
                !r.message && 'text-muted-foreground italic',
              )}
            >
              {r.message ? `“${r.message}”` : 'No message was added.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-muted p-5">
          <p className="mb-4 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">Progress</p>
          {closed ? (
            <div className="rounded-2xl bg-status-declined-bg p-4 text-sm font-semibold text-status-declined">
              {r.status === 'declined'
                ? `${r.provider.name.split(' ')[0]} declined this request${r.responded_at ? ` on ${formatDate(r.responded_at)}` : ''}.`
                : `Cancelled${r.cancelled_at ? ` on ${formatDate(r.cancelled_at)}` : ''}. No credits moved.`}
            </div>
          ) : (
            <ol>
              {stamps.map((s, i) => (
                <Step
                  key={s.label}
                  label={s.label}
                  detail={s.at ? relativeTime(s.at) : i === currentIndex ? 'Up next' : 'Not yet'}
                  state={s.at ? 'done' : i === currentIndex ? 'current' : 'todo'}
                  last={i === stamps.length - 1}
                />
              ))}
            </ol>
          )}
        </div>
      </div>

      {actions || note ? (
        <div className="border-t bg-wine-800 p-5 text-wine-on sm:px-8 sm:py-5">
          {error ? (
            <p role="alert" className="mb-3 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-negative">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {note ? <p className="text-sm font-medium text-wine-on-muted sm:max-w-sm">{note}</p> : <span />}
            {actions ? <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">{actions}</div> : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
