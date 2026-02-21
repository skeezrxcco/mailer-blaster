"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Chrome, Eye, EyeOff, Github, Loader2, UserPlus } from "lucide-react"
import { signIn as authSignIn } from "next-auth/react"
import { toast } from "sonner"

import { VerificationCodeInput } from "@/components/shared/auth/verification-code-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null)
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const lastAttemptedCodeRef = useRef("")

  const countdown = verificationExpiresAt ? Math.max(0, Math.ceil((verificationExpiresAt - nowMs) / 1000)) : 0

  useEffect(() => {
    if (!awaitingVerification || !verificationExpiresAt) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [awaitingVerification, verificationExpiresAt])

  const requestSignupCode = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Complete name, email, and password first.")
      return false
    }

    setError("")
    setIsSendingCode(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to send verification code")
      }

      const payload = (await response.json()) as { expiresAt?: string }
      const expiresAtMs = payload.expiresAt ? new Date(payload.expiresAt).getTime() : Date.now() + 60_000

      setAwaitingVerification(true)
      setVerificationExpiresAt(expiresAtMs)
      setNowMs(Date.now())
      lastAttemptedCodeRef.current = ""
      toast.success("Verification code sent")
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send verification code"
      setError(message)
      toast.error(message)
      return false
    } finally {
      setIsSendingCode(false)
    }
  }

  const signUp = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    await requestSignupCode()
    setIsLoading(false)
  }

  const verifyAndContinue = async (codeToVerify: string) => {
    setError("")
    setIsVerifying(true)

    try {
      const response = await fetch("/api/auth/register/verify", {
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

      const payload = (await response.json()) as { loginCode?: string }
      if (!payload.loginCode) {
        throw new Error("Unable to complete signup session")
      }

      const signInResult = await authSignIn("credentials", {
        email,
        password,
        code: payload.loginCode,
        redirect: false,
        callbackUrl: "/chat",
      })
      if (!signInResult || signInResult.error || !signInResult.ok) {
        throw new Error("Unable to sign in after verification.")
      }

      let sessionReady = false
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" })
        if (sessionResponse.ok) {
          const sessionPayload = (await sessionResponse.json()) as { user?: { email?: string | null } | null }
          if (sessionPayload.user?.email) {
            sessionReady = true
            break
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 150))
      }

      if (!sessionReady) {
        throw new Error("Account created but session was not established. Please sign in again.")
      }

      const destination = signInResult.url && !signInResult.url.includes("/signup") ? signInResult.url : "/chat"
      window.location.assign(destination)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to verify code"
      setError(message)
      toast.error(message)
    } finally {
      setIsVerifying(false)
    }
  }

  const signInWithSocial = async (provider: "google" | "github") => {
    setError("")
    setCode("")
    setSocialLoading(provider)

    try {
      await authSignIn(provider, { callbackUrl: "/chat" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in"
      setError(message)
      toast.error(message)
    } finally {
      setSocialLoading(null)
    }
  }

  useEffect(() => {
    if (!awaitingVerification) return
    if (isVerifying || countdown <= 0) return
    if (!/^\d{6}$/.test(code)) return
    if (lastAttemptedCodeRef.current === code) return

    lastAttemptedCodeRef.current = code
    void verifyAndContinue(code)
  }, [awaitingVerification, code, countdown, isVerifying])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#0f766e_0%,#0f172a_42%,#020617_100%)] px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-zinc-950/70 shadow-[0_32px_90px_rgba(0,0,0,0.45)] md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,#14532d_0%,#111827_58%,#020617_100%)] p-8 md:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/85">blastermailer AI</p>
            <h1 className="mt-4 text-3xl font-semibold text-zinc-100">Create your workspace and launch campaigns in minutes.</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Professional templates, audience management, and campaign analytics in one streamlined platform.
            </p>
          </div>
          <div className="space-y-2 text-sm text-zinc-300">
            <p>• AI-assisted content generation</p>
            <p>• CSV contact import and segmentation</p>
            <p>• Built-in activity and performance tracking</p>
          </div>
        </section>
        <Card className="rounded-none border-0 bg-zinc-950/88 text-zinc-100 shadow-none md:min-h-[680px]">
          {!awaitingVerification ? (
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">Create account</CardTitle>
              <CardDescription>Start building campaigns with social or email sign up.</CardDescription>
            </CardHeader>
          ) : null}
          <CardContent className="space-y-4 md:flex md:min-h-[540px] md:flex-col">
            {!awaitingVerification ? (
              <div className="space-y-4 md:flex-1 md:pt-2">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => signInWithSocial("google")}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />} Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => signInWithSocial("github")}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Continue with GitHub
                  </Button>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Or continue with email</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <form className="space-y-3" onSubmit={signUp}>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Full name"
                    required
                    className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    required
                    className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
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
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create account
                  </Button>
                </form>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-8 fade-in space-y-4 duration-500 md:flex md:flex-1 md:flex-col md:justify-center">
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-semibold text-zinc-100">Verify Your Account</h2>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{countdown > 0 ? `Expires in ${countdown}s` : "Expired"}</p>
                </div>
                <div className="space-y-3">
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
                    disabled={isVerifying || countdown <= 0}
                    autoFocus
                  />
                  {isVerifying ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSendingCode || countdown > 0}
                    onClick={requestSignupCode}
                    className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isSendingCode ? "Sending..." : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAwaitingVerification(false)
                      setCode("")
                      setError("")
                      setVerificationExpiresAt(null)
                      lastAttemptedCodeRef.current = ""
                    }}
                    className="h-10 w-full text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100"
                  >
                    Back to signup
                  </Button>
                </div>
              </div>
            )}

            {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

            {!awaitingVerification ? (
              <p className="text-sm text-zinc-400">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-sky-300 hover:text-sky-200">
                  Sign in
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
