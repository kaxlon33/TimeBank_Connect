import { useEffect, useMemo, useState } from 'react'
import { Popover } from 'radix-ui'
import { Check, ChevronDown, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Country } from '@/types'

interface Props {
  id: string
  value: string
  onChange: (code: string) => void
  invalid?: boolean
  describedBy?: string
}

/** A country field that opens a short, searchable list right under it. */
export function CountrySelect({ id, value, onChange, invalid, describedBy }: Props) {
  const [countries, setCountries] = useState<Country[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    api.getCountries().then(
      (list) => active && setCountries(list),
      () => active && setCountries([]),
    )
    return () => {
      active = false
    }
  }, [])

  const selected = countries.find((c) => c.code === value)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? countries.filter((c) => c.name.toLowerCase().includes(q)) : countries
  }, [countries, query])

  function pick(code: string) {
    onChange(code)
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <Popover.Trigger
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-[12px] border border-input bg-card px-4 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          invalid && 'border-negative',
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.name : countries.length ? 'Choose your country' : 'Loading countries…'}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          onOpenAutoFocus={(e) => {
            // Focus the search box, not the first row.
            e.preventDefault()
            document.getElementById(`${id}-search`)?.focus()
          }}
          className="z-50 w-[calc(var(--radix-popover-trigger-width)/var(--popup-scale))] overflow-hidden rounded-2xl border bg-card shadow-raised"
        >
          <div className="flex items-center gap-2 border-b px-3.5">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && shown[0]) {
                  e.preventDefault()
                  pick(shown[0].code)
                }
              }}
              placeholder="Search countries"
              aria-label="Search countries"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <ul role="listbox" aria-label="Countries" className="max-h-60 overflow-y-auto p-1.5">
            {shown.length ? (
              shown.map((c) => {
                const on = c.code === value
                return (
                  <li key={c.code} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onClick={() => pick(c.code)}
                      className={cn(
                        'flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none',
                        on && 'bg-primary-soft font-bold text-wine-700',
                      )}
                    >
                      {c.name}
                      {on ? <Check className="size-4" aria-hidden="true" /> : null}
                    </button>
                  </li>
                )
              })
            ) : (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">No country found</li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
