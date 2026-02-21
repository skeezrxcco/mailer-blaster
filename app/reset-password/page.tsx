"use client"

import Link from "next/link"
import { useState } from "react"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<"request" | "confirm">("request")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const requestResetCode = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to request reset code")
      }

      setStep("confirm")
      setNotice("If the account exists, a reset code was sent to your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request reset code")
    } finally {
      setIsLoading(false)
    }
  }

  const confirmReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code, newPassword }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to reset password")
      }

      setNotice("Password updated. You can now sign in with your new password.")
      setCode("")
      setNewPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%,#000000_100%)] px-4 py-10">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
      <Card className="w-full max-w-lg border-zinc-800 bg-zinc-950/85 text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>Use a 6-digit verification code sent to your email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "request" ? (
            <form className="space-y-3" onSubmit={requestResetCode}>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
              />
              <Button type="submit" disabled={isLoading} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Send reset code
              </Button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={confirmReset}>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100" />
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                required
                className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password (min 8 characters)"
                  required
                  className="h-11 border-zinc-700 bg-zinc-900 pr-11 text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" disabled={isLoading} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Update password
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={requestResetCode}
                className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              >
                Resend code
              </Button>
            </form>
          )}

          {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
          {notice ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}

          <p className="text-sm text-zinc-400">
            Back to{" "}
            <Link href="/login" className="font-medium text-sky-300 hover:text-sky-200">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
