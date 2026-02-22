import { cn } from "@/lib/utils"

export function WorkspacePageSkeleton({
  title = "Loading",
  compact = false,
}: {
  title?: string
  compact?: boolean
}) {
  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#1f2937_0%,#09090b_42%,#030712_100%)] text-zinc-100">
      <div className="h-full p-0">
        <div className="flex h-full overflow-hidden bg-zinc-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <aside className="hidden h-full w-56 shrink-0 border-r border-zinc-800/90 bg-zinc-950/92 p-3 lg:flex lg:flex-col">
            <div className="mb-3 h-9 w-32 animate-pulse rounded-xl bg-zinc-800/70" />
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-xl bg-zinc-900/70" />
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-zinc-900/45 p-2">
              <div className="mb-2 h-3 w-20 animate-pulse rounded bg-zinc-800/80" />
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-8 animate-pulse rounded-lg bg-zinc-900/80" />
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-4">
              <div className="h-20 animate-pulse rounded-2xl bg-zinc-900/70" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-900/70" />
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="h-8 w-28 animate-pulse rounded-full bg-zinc-900/70" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-900/75" />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-3xl bg-zinc-950/45 p-4 md:p-6">
              <div className="mb-4 h-7 w-52 animate-pulse rounded-lg bg-zinc-800/80" />
              <div className="mb-6 h-4 w-80 max-w-[90%] animate-pulse rounded bg-zinc-800/70" />
              <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>
                {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-2xl bg-zinc-900/75" />
                ))}
              </div>
              <div className="mt-6 h-3 w-40 animate-pulse rounded bg-zinc-800/70" />
              <p className="mt-2 text-xs text-zinc-500">{title}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
