import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Placeholder for pages that are designed but not built yet. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center px-4 pb-32 text-center">
      <div className="tile-in rounded-[28px] border bg-card p-10 shadow-raised">
        <img src="/logo-mark.png" alt="" width={72} height={72} className="mx-auto size-[72px] rounded-[24%]" />
        <h1 className="font-heading mt-6 text-4xl font-bold tracking-[-0.04em]">{title}</h1>
        <p className="mt-2 text-muted-foreground">This page is designed and next on the build list.</p>
        <Link
          to="/"
          className="press mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to browse
        </Link>
      </div>
    </div>
  )
}
