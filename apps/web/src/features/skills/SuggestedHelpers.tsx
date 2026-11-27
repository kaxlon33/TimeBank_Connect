import { Sparkles } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import type { ID } from '@/types'

/**
 * Other members who could also help with this kind of skill, best match first.
 * The score is explained in plain words, so it is clear why each person is shown.
 */
export function SuggestedHelpers({ skillId }: { skillId: ID }) {
  const helpers = useAsync(() => api.getSuggestedHelpers(skillId), `suggested-helpers|${skillId}`)

  return (
    <section aria-labelledby="suggested-helpers-title" className="tile-in p-6 sm:p-8">
      <div className="mb-5">
        <h2 id="suggested-helpers-title" className="font-heading text-2xl font-bold tracking-[-0.03em]">
          Other helpers you could ask
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Members who offer something similar, ranked by distance, trust and availability.</p>
      </div>

      {helpers.status === 'loading' ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
          ))}
        </div>
      ) : helpers.status === 'error' ? (
        <p role="alert" className="text-sm text-muted-foreground">
          We could not load suggestions right now.
        </p>
      ) : helpers.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No other helpers offer this yet.</p>
      ) : (
        <ul className="space-y-3">
          {helpers.data.map((h) => (
            <li key={h.id} className="flex gap-4 rounded-2xl border bg-background p-4">
              <Avatar name={h.name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-bold">{h.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-wine-700">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {h.score} match
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{h.area ?? 'Area not set'}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Why ${h.name} is suggested`}>
                  {h.reasons.map((reason) => (
                    <li key={reason} className="rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
