import { Skeleton } from "@/components/ui/skeleton"

/**
 * Route-level fallback shown inside <main> while a page streams in.
 *
 * dental had no loading boundary at all, so every sidebar click held the
 * previous page frozen until the new one had fully rendered on the server.
 * Because `(app)/layout.tsx` reads cookies (requireAuth) the shell still cannot
 * stream before auth resolves — but from that point on this boundary paints
 * immediately and the page's own queries stream in behind it.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8" aria-busy="true" aria-live="polite">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-lg lg:col-span-2" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  )
}
