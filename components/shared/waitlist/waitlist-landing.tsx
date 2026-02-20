import { Sparkles } from "lucide-react"

import { WaitlistForm } from "@/components/shared/waitlist/waitlist-form"

export function WaitlistLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          Blastermailer is almost here
        </div>

        <h1 className="text-center text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          AI email campaigns, built for speed.
        </h1>
        <p className="mt-5 max-w-2xl text-center text-base leading-relaxed text-zinc-300 sm:text-lg">
          We are polishing the launch. Join the waitlist to get early access and updates on
          rollout, templates, and campaign automation.
        </p>

        <div className="mt-10 w-full max-w-xl">
          <WaitlistForm />
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500">
          By joining, you agree to receive launch updates. Unsubscribe anytime.
        </p>
      </div>
    </main>
  )
}

