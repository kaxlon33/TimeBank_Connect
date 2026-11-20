import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { cn } from '@/lib/utils'

export interface FilterOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface Props<T extends string> {
  label: string
  icon: LucideIcon
  value: T
  onChange: (value: T) => void
  options: FilterOption<T>[]
  /** "bar" sits inside a search bar; "pill" stands alone. */
  variant?: 'bar' | 'pill'
}

/** A control that opens a small menu. Keyboard friendly: arrows to move, Enter to choose, Esc to close. */
export function FilterMenu<T extends string>({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  variant = 'pill',
}: Props<T>) {
  const current = options.find((o) => o.value === value) ?? options[0]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${label}: ${current.label}`}
        className={cn(
          'press group flex items-center text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
          variant === 'bar'
            ? 'h-14 min-w-0 gap-3 rounded-2xl px-3 hover:bg-muted data-[state=open]:bg-primary-soft'
            : 'h-11 shrink-0 gap-2 rounded-full border bg-card pr-3 pl-3.5 text-sm font-bold hover:bg-primary-soft data-[state=open]:border-wine-700 data-[state=open]:bg-primary-soft',
        )}
      >
        {variant === 'bar' ? (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-wine-700 max-sm:hidden">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">{label}</span>
              <span className="truncate text-sm font-bold">{current.label}</span>
            </span>
            <ChevronDown
              className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </>
        ) : (
          <>
            <Icon className="size-4 text-wine-700" aria-hidden="true" />
            {current.label}
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 min-w-[240px] origin-(--radix-dropdown-menu-content-transform-origin) rounded-2xl border bg-popover p-1.5 shadow-raised data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            {label}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
            {options.map((o) => (
              <DropdownMenu.RadioItem
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none select-none data-[highlighted]:bg-primary-soft data-[state=checked]:text-wine-700"
              >
                <span className="flex flex-col">
                  {o.label}
                  {o.hint ? <span className="text-xs font-medium text-muted-foreground">{o.hint}</span> : null}
                </span>
                <DropdownMenu.ItemIndicator>
                  <Check className="size-4 text-wine-700" aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
