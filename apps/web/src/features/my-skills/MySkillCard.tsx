import { useState, type CSSProperties } from 'react'
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react'
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

export function MySkillCard({ skill, index, busy, onEdit, onToggleVisible, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const hidden = skill.status === 'hidden'

  return (
    <li
      style={{ '--delay': staggerDelay(index) } as CSSProperties}
      className="tile-in relative flex flex-col overflow-hidden rounded-[28px] border bg-card shadow-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-wine-800">
        <img
          src={skillImage(skill)}
          alt=""
          width={640}
          height={400}
          loading="lazy"
          className={cn('size-full object-cover transition duration-300', hidden && 'opacity-60 grayscale')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-wine-900/55 to-transparent" />
        <span className="absolute top-3.5 left-3.5 rounded-full border border-white/25 bg-wine-900/45 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
          {skill.category.name}
        </span>
        <span
          className={cn(
            'absolute top-3.5 right-3.5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
            hidden ? 'bg-white/90 text-muted-foreground' : 'bg-brass text-wine-900',
          )}
        >
          {hidden ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
          {hidden ? 'Hidden' : 'Visible'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex-1">
          <h3 className="font-heading text-[22px] leading-[1.08] font-bold tracking-[-0.03em] text-balance">{skill.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{skill.description}</p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <button
            type="button"
            role="switch"
            aria-checked={!hidden}
            aria-label={`${skill.title} is ${hidden ? 'hidden' : 'visible'}. Switch to ${hidden ? 'show' : 'hide'} it`}
            disabled={busy}
            onClick={onToggleVisible}
            className="press flex items-center gap-2.5 text-sm font-bold disabled:opacity-60"
          >
            <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', hidden ? 'bg-stone-300' : 'bg-wine-700')}>
              <span
                className={cn(
                  'absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-white shadow-card transition-transform duration-200',
                  !hidden && 'translate-x-5',
                )}
              >
                {busy ? <Loader2 className="size-3 animate-spin text-wine-700" aria-hidden="true" /> : null}
              </span>
            </span>
            {hidden ? 'Hidden' : 'Shown'}
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="press flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold hover:bg-secondary disabled:opacity-60"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete ${skill.title}`}
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="press grid size-10 place-items-center rounded-xl border text-negative hover:bg-status-declined-bg disabled:opacity-60"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {confirming ? (
        <div role="alertdialog" aria-label={`Delete ${skill.title}?`} className="tile-in absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-wine-900/92 p-6 text-center text-white backdrop-blur-sm">
          <p className="font-heading text-2xl leading-tight font-bold tracking-[-0.03em]">Delete this skill?</p>
          <p className="max-w-xs text-sm text-wine-on-muted">It disappears for everyone. Hide it instead if you only want a break.</p>
          <div className="flex gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirming(false)}
              className="press h-12 rounded-2xl border border-white/30 bg-white/10 px-5 text-sm font-bold hover:bg-white/20"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                onDelete()
              }}
              className="press h-12 rounded-2xl bg-white px-5 text-sm font-bold text-negative hover:bg-white/90"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
