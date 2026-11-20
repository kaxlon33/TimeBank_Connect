import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useDebouncedValue } from '@/lib/hooks'
import type { Area } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  value: string
  countryCode: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
}

type Option = { kind: 'area'; area: Area } | { kind: 'custom'; name: string }

/** ARIA combobox: arrow keys move, Enter picks, Escape closes. Falls back to free text if lookup fails. */
export function AreaAutocomplete({ id, value, countryCode, onChange, invalid, describedBy }: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [results, setResults] = useState<Area[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const query = useDebouncedValue(value, 300)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2 || !open) {
      setResults([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    api
      .searchAreas(query, countryCode, controller.signal)
      .then((list) => {
        setResults(list)
        setActive(-1)
      })
      .catch((e: unknown) => {
        if (!(e instanceof DOMException)) setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [query, countryCode, open])

  const exact = results.some((a) => a.name.toLowerCase() === value.trim().toLowerCase())
  const options: Option[] = [
    ...results.map((area) => ({ kind: 'area' as const, area })),
    ...(value.trim().length >= 2 && !exact && !loading ? [{ kind: 'custom' as const, name: value.trim() }] : []),
  ]
  const showList = open && value.trim().length >= 2 && (loading || options.length > 0 || failed)

  const pick = (o: Option) => {
    onChange(o.kind === 'area' ? o.area.name : o.name)
    setOpen(false)
  }

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(e) => {
        if (!wrapper.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id={id}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={countryCode ? 'Start typing, e.g. Hackney' : 'Choose a country first'}
        className="pl-9"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(options.length - 1, i + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(0, i - 1))
          } else if (e.key === 'Enter' && active >= 0 && options[active]) {
            e.preventDefault()
            pick(options[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {loading ? (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : null}
      <ul
        id={listId}
        role="listbox"
        aria-label="Area suggestions"
        className={cn(
          'absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-x-hidden overflow-y-auto rounded-[14px] border bg-popover p-1.5 shadow-[var(--shadow-raised)]',
          !showList && 'hidden',
        )}
      >
        {failed ? (
          <li className="px-3 py-2.5 text-sm text-muted-foreground">Suggestions are unavailable right now. You can still type your area.</li>
        ) : loading && options.length === 0 ? (
          <li className="px-3 py-2.5 text-sm text-muted-foreground">Searching areas…</li>
        ) : (
          options.map((o, i) => (
            <li
              key={o.kind === 'area' ? o.area.id : 'custom'}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-sm',
                active === i && 'bg-stone-100',
              )}
            >
              {o.kind === 'area' ? (
                <>
                  <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{o.area.name}</span>
                    <span className="text-muted-foreground">, {o.area.country_name}</span>
                  </span>
                </>
              ) : (
                <>
                  <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    Use “<span className="font-medium">{o.name}</span>” as a new area
                  </span>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
