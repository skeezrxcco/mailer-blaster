"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { VerificationCodeInput } from "@/components/shared/auth/verification-code-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<"request" | "code" | "password">("request")
  const [error, setError] = useState("")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const lastAttemptedCodeRef = useRef("")

  const countdown = verificationExpiresAt ? Math.max(0, Math.ceil((verificationExpiresAt - nowMs) / 1000)) : 0

  useEffect(() => {
    if (step !== "code" || !verificationExpiresAt) return

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [step, verificationExpiresAt])

  const requestResetCode = async (event?: React.FormEvent | React.MouseEvent) => {
    event?.preventDefault()
    setError("")
    setIsSendingCode(true)

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

      setCode("")
      setNewPassword("")
      setConfirmPassword("")
      setStep("code")
      setVerificationExpiresAt(Date.now() + 60_000)
      setNowMs(Date.now())
      lastAttemptedCodeRef.current = ""
      toast.success("If the account exists, a verification code was sent.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to request reset code"
      setError(message)
      toast.error(message)
    } finally {
      setIsSendingCode(false)
    }
  }

  const verifyCode = async (codeToVerify: string) => {
    setError("")
    setIsVerifyingCode(true)

    try {
      const response = await fetch("/api/auth/password-reset/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: codeToVerify }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to verify code")
      }

      setStep("password")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to verify code"
      setError(message)
      toast.error(message)
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const confirmReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      const message = "Passwords do not match."
      setError(message)
      toast.error(message)
      return
    }

    setIsUpdatingPassword(true)

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

      toast.success("Password updated. Sign in with your new password.")
      setCode("")
      setNewPassword("")
      setConfirmPassword("")
      setVerificationExpiresAt(null)
      lastAttemptedCodeRef.current = ""
      router.push("/login")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reset password"
      setError(message)
      toast.error(message)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  useEffect(() => {
    if (step !== "code") return
    if (isVerifyingCode || countdown <= 0) return
    if (!/^\d{6}$/.test(code)) return
    if (lastAttemptedCodeRef.current === code) return

    lastAttemptedCodeRef.current = code
    void verifyCode(code)
  }, [step, code, countdown, isVerifyingCode])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_55%,#000000_100%)] px-4 py-10">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
      <Card className="w-full max-w-lg border-zinc-800/80 bg-zinc-950/88 text-zinc-100 md:min-h-[470px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>Recover access in two quick steps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5 md:flex md:min-h-[300px] md:flex-col">
          {step === "request" ? (
            <form className="space-y-3 md:my-auto" onSubmit={requestResetCode}>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
              />
              <Button type="submit" disabled={isSendingCode} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Send reset code
              </Button>
            </form>
          ) : null}

          {step === "code" ? (
            <div className="animate-in slide-in-from-right-8 fade-in space-y-3 duration-500 md:my-auto md:flex md:flex-1 md:flex-col md:justify-center">
              <p className="text-center text-xs uppercase tracking-wide text-zinc-500">{countdown > 0 ? `Expires in ${countdown}s` : "Expired"}</p>
              <VerificationCodeInput
                value={code}
                onChange={(nextCode) => {
                  setCode(nextCode)
                  setError("")
                  if (nextCode.length < 6) {
                    lastAttemptedCodeRef.current = ""
                  }
                }}
                invalid={Boolean(error)}
                disabled={isVerifyingCode || countdown <= 0}
                autoFocus
              />
              {isVerifyingCode ? (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isSendingCode || isVerifyingCode || countdown > 0}
                onClick={(event) => {
                  void requestResetCode(event)
                }}
                className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              >
                {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSendingCode ? "Sending..." : "Resend code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSendingCode || isVerifyingCode}
                onClick={() => {
                  setStep("request")
                  setCode("")
                  setError("")
                  setVerificationExpiresAt(null)
                  lastAttemptedCodeRef.current = ""
                }}
                className="h-10 w-full text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100"
              >
                Back
              </Button>
            </div>
          ) : null}

          {step === "password" ? (
            <form className="animate-in slide-in-from-right-8 fade-in space-y-3 duration-500 md:my-auto" onSubmit={confirmReset}>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
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
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                required
                className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
              />
              <Button type="submit" disabled={isUpdatingPassword} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Update password
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isUpdatingPassword}
                onClick={() => setStep("code")}
                className="h-10 w-full text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100"
              >
                Back
              </Button>
            </form>
          ) : null}

          {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <p className="pt-1 text-sm text-zinc-400">
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
