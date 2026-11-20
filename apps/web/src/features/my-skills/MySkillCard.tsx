import { useState, type CSSProperties } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { staggerDelay } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'
import type { Skill } from '@/types'

interface Props {
  skill: Skill
  index: number
  busy: boolean
  onEdit: () => void
  onToggleVisible: () => void
  onDelete: () => void
}

/** One skill as a compact row: small picture, title and the few things you can do with it. */
export function MySkillCard({ skill, index, busy, onEdit, onToggleVisible, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const hidden = skill.status === 'hidden'

  return (
    <li
      style={{ '--delay': staggerDelay(index) } as CSSProperties}
      className="tile-in relative flex gap-4 overflow-hidden rounded-[24px] border bg-card p-3 shadow-card sm:p-3.5"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-wine-800 sm:size-32">
        <img
          src={skillImage(skill)}
          alt=""
          width={256}
          height={256}
          loading="lazy"
          className={cn('size-full object-cover transition duration-300', hidden && 'opacity-50 grayscale')}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-wine-700">{skill.category.name}</span>
            <span className={cn('flex shrink-0 items-center gap-1.5 text-[11px] font-bold', hidden ? 'text-muted-foreground' : 'text-status-completed')}>
              <span className={cn('size-1.5 rounded-full', hidden ? 'bg-stone-300' : 'bg-status-completed')} aria-hidden="true" />
              {hidden ? 'Hidden' : 'Visible'}
            </span>
          </div>
          <h3 className="font-heading mt-1.5 truncate text-lg leading-tight font-bold tracking-[-0.02em]">{skill.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{skill.description}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={!hidden}
            aria-label={`${skill.title} is ${hidden ? 'hidden' : 'visible'}. Switch to ${hidden ? 'show' : 'hide'} it`}
            disabled={busy}
            onClick={onToggleVisible}
            className="press flex items-center gap-2 text-[13px] font-bold disabled:opacity-60"
          >
            <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200', hidden ? 'bg-stone-300' : 'bg-wine-700')}>
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 grid size-5 place-items-center rounded-full bg-white shadow-card transition-transform duration-200',
                  !hidden && 'translate-x-4',
                )}
              >
                {busy ? <Loader2 className="size-3 animate-spin text-wine-700" aria-hidden="true" /> : null}
              </span>
            </span>
            <span className="max-sm:sr-only">{hidden ? 'Show' : 'Shown'}</span>
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="press flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold hover:bg-secondary disabled:opacity-60"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete ${skill.title}`}
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="press grid size-9 place-items-center rounded-xl border text-negative hover:bg-status-declined-bg disabled:opacity-60"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {confirming ? (
        <div
          role="alertdialog"
          aria-label={`Delete ${skill.title}?`}
          className="tile-in absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-wine-900/92 p-4 text-center text-white backdrop-blur-sm"
        >
          <p className="font-heading text-xl leading-tight font-bold tracking-[-0.03em]">Delete this skill?</p>
          <p className="max-w-xs text-xs text-wine-on-muted">It disappears for everyone. Hide it instead if you only want a break.</p>
          <div className="flex gap-2.5">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirming(false)}
              className="press h-10 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-bold hover:bg-white/20"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                onDelete()
              }}
              className="press h-10 rounded-xl bg-white px-4 text-sm font-bold text-negative hover:bg-white/90"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
