import type { CSSProperties } from 'react'
import { Avatar } from '@/components/Avatar'
import { hoursLabel } from '@/lib/format'
import { staggerDelay } from '@/lib/hooks'
import { skillImage } from '@/lib/skillImages'
import { cn } from '@/lib/utils'
import type { HelpRequest } from '@/types'
import { StatusTag } from './StatusTag'
import { otherParty, whenLabel, type Box } from './status'

interface Props {
  request: HelpRequest
  box: Box
  selected: boolean
  index: number
  onSelect: () => void
}

export function RequestRow({ request, box, selected, index, onSelect }: Props) {
  const other = otherParty(request, box)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{ '--delay': staggerDelay(index) } as CSSProperties}
      className={cn(
        'tile-in press group flex w-full items-center gap-3.5 rounded-[22px] border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200',
        selected ? 'border-wine-700 bg-card shadow-card ring-1 ring-wine-700' : 'bg-card hover:border-stone-200 hover:shadow-card',
      )}
    >
      <img
        src={skillImage(request.skill)}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        className="size-16 shrink-0 rounded-2xl object-cover"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <Avatar name={other.name} size={22} />
          <span className="truncate text-sm font-bold">{other.name}</span>
        </span>
        <span className="truncate text-[13px] text-muted-foreground">{request.skill.title}</span>
        <span className="text-xs font-semibold text-muted-foreground">
          {hoursLabel(request.hours)} · {whenLabel(request)}
        </span>
      </span>
      <StatusTag request={request} box={box} />
    </button>
  )
}
