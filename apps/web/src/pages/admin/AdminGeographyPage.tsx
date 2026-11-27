import { useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Eye, EyeOff, Globe2, Loader2, MapPin, Pencil, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader } from '@/features/admin/AdminShell'
import { api, ApiError } from '@/lib/api'
import { staggerDelay, useAsync, useDebouncedValue } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { AdminArea, AdminCountry, ID } from '@/types'

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

/** Section card shared by both lists. */
function Section({ title, hint, children, delay }: { title: string; hint: string; children: ReactNode; delay: string }) {
  return (
    <section aria-label={title} className="tile-in rounded-[28px] border bg-card shadow-card" style={{ '--delay': delay } as CSSProperties}>
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="font-heading text-xl font-bold tracking-[-0.02em]">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  )
}

/** The country list, loaded once by the page and shared by both sections. */
type CountriesState = ReturnType<typeof useAsync<AdminCountry[]>>

function CountriesSection({ countries }: { countries: CountriesState }) {
  const [busy, setBusy] = useState<ID | null>(null)
  const list = countries.status === 'success' ? countries.data : []

  async function toggle(country: AdminCountry) {
    setBusy(country.id)
    try {
      const updated = await api.toggleCountry(country.id)
      countries.setData((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success(updated.is_active ? `${updated.name} is back on the sign-up list` : `${updated.name} is hidden from sign-up`)
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Section title="Countries" hint="Switch a country off to hide it from sign-up. Nobody is moved or removed." delay="60ms">
      {countries.status === 'loading' ? (
        <div className="space-y-2 p-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-14 rounded-2xl" />
          ))}
        </div>
      ) : countries.status === 'error' ? (
        <div role="alert" className="p-8 text-center">
          <p className="font-bold">We couldn’t load countries</p>
          <button type="button" onClick={countries.reload} className="press mt-3 h-10 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on">
            Try again
          </button>
        </div>
      ) : (
        <ul className="grid max-h-[420px] gap-px overflow-y-auto bg-border sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => (
            <li
              key={c.id}
              style={{ '--delay': staggerDelay(i) } as CSSProperties}
              className="tile-in flex items-center gap-2.5 bg-card px-4 py-2.5"
            >
              {c.flag_url ? (
                <img src={c.flag_url} alt="" width={24} height={16} loading="lazy" className="h-4 w-6 shrink-0 rounded-[3px] object-cover" />
              ) : (
                <span className="grid h-4 w-6 shrink-0 place-items-center rounded-[3px] bg-secondary text-muted-foreground">
                  <Globe2 className="size-3" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-bold', !c.is_active && 'text-muted-foreground line-through')}>{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.code} · {c.areas_count} {c.areas_count === 1 ? 'area' : 'areas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(c)}
                disabled={busy === c.id}
                aria-pressed={c.is_active}
                aria-label={`${c.is_active ? 'Hide' : 'Show'} ${c.name} on sign-up`}
                className={cn(
                  'press inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-colors disabled:opacity-60',
                  c.is_active
                    ? 'bg-status-completed-bg text-status-completed hover:brightness-95'
                    : 'bg-secondary text-muted-foreground hover:brightness-95',
                )}
              >
                {busy === c.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : c.is_active ? (
                  <Eye className="size-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                )}
                {c.is_active ? 'On' : 'Off'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function AreaRow({
  area,
  onSaved,
  onDeleted,
}: {
  area: AdminArea
  onSaved: (area: AdminArea) => void
  onDeleted: (id: ID) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(area.name)
  const [saving, setSaving] = useState(false)
  const occupied = area.members_count > 0

  async function save() {
    if (name.trim() === area.name) return setEditing(false)
    setSaving(true)
    try {
      onSaved(await api.renameArea(area.id, name.trim()))
      setEditing(false)
      toast.success('Area renamed')
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${area.name}”? This cannot be undone.`)) return
    try {
      await api.deleteArea(area.id)
      onDeleted(area.id)
      toast.success('Area deleted')
    } catch (err) {
      toast.error(errorText(err))
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap sm:px-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-wine-700">
        <MapPin className="size-4" aria-hidden="true" />
      </span>

      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label htmlFor={`area-${area.id}`} className="sr-only">
            New name for {area.name}
          </label>
          <input
            id={`area-${area.id}`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="button" onClick={save} disabled={saving} aria-label="Save name" className="press grid size-10 place-items-center rounded-xl bg-wine-700 text-wine-on disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="press grid size-10 place-items-center rounded-xl border hover:bg-secondary">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{area.name}</p>
          <p className="text-xs text-muted-foreground">
            {area.country_name ?? '—'} · {occupied ? `${area.members_count} ${area.members_count === 1 ? 'member' : 'members'}` : 'No members yet'}
          </p>
        </div>
      )}

      {editing ? null : (
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => setEditing(true)} className="press inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[13px] font-bold hover:bg-secondary">
            <Pencil className="size-4" aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={occupied}
            title={occupied ? 'Members live here, so rename it instead.' : 'Delete this area'}
            className="press inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-bold text-negative hover:bg-status-declined-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </li>
  )
}

function AreasSection({ countries }: { countries: AdminCountry[] }) {
  const [chosen, setChosen] = useState<string | null>(null)
  const [text, setText] = useState('')
  const query = useDebouncedValue(text.trim(), 300)

  // Start on Great Britain when it is in the list, otherwise on the first country.
  const code = chosen ?? countries.find((c) => c.code === 'GB')?.code ?? countries[0]?.code ?? ''
  const areas = useAsync((signal) => api.getAdminAreas(code, query, signal), `admin-areas|${code}|${query}`)
  const list = areas.status === 'success' ? areas.data : []

  return (
    <Section title="Areas" hint="Members choose an area when they sign up. Rename a misspelt one, or delete an unused one." delay="120ms">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="relative sm:w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="area-search" className="sr-only">
            Search areas
          </label>
          <input
            id="area-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search areas…"
            autoComplete="off"
            className="h-11 w-full rounded-2xl border bg-card pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-wine-600 focus-visible:ring-4 focus-visible:ring-wine-600/15 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <label className="sr-only" htmlFor="area-country">
          Country
        </label>
        <select
          id="area-country"
          value={code}
          onChange={(e) => setChosen(e.target.value)}
          className="h-11 rounded-2xl border bg-card px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {areas.status === 'loading' ? (
        <div className="space-y-2 p-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-14 rounded-2xl" />
          ))}
        </div>
      ) : areas.status === 'error' ? (
        <div role="alert" className="p-8 text-center">
          <p className="font-bold">We couldn’t load areas</p>
          <button type="button" onClick={areas.reload} className="press mt-3 h-10 rounded-xl bg-wine-700 px-4 text-sm font-bold text-wine-on">
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">No areas found. Members add new areas when they sign up.</p>
      ) : (
        <ul className="divide-y">
          {list.map((a) => (
            <AreaRow
              key={a.id}
              area={a}
              onSaved={(saved) => areas.setData((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))}
              onDeleted={(id) => areas.setData((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </ul>
      )}
    </Section>
  )
}

export function AdminGeographyPage() {
  const countries = useAsync(() => api.getAdminCountries(), 'admin-countries')

  return (
    <div className="space-y-6">
      <AdminHeader kicker="Where members can live" title="Countries & areas" />
      <CountriesSection countries={countries} />
      {countries.status === 'success' && countries.data.length > 0 ? <AreasSection countries={countries.data} /> : null}
    </div>
  )
}
