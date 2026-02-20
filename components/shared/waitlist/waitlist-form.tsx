"use client"

import { FormEvent, useMemo, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const emailIsValid = useMemo(() => EMAIL_PATTERN.test(email.trim()), [email])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!emailIsValid || isSubmitting) return

    setIsSubmitting(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      })

      const payload = (await response.json()) as { error?: string; alreadyJoined?: boolean }
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to join the waitlist right now.")
      }

      setMessage(payload.alreadyJoined ? "You are already on the waitlist." : "You are on the waitlist.")
      setEmail("")
      setName("")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to join the waitlist.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl bg-zinc-900/70 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr]">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name (optional)"
          className="h-12 rounded-2xl border-white/15 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
          aria-label="Name"
        />
        <Input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="h-12 rounded-2xl border-white/15 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500"
          aria-label="Email"
        />
      </div>

      <Button
        type="submit"
        disabled={!emailIsValid || isSubmitting}
        className="h-12 w-full rounded-2xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          "Join waitlist"
        )}
      </Button>

      {message ? (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  )
}

