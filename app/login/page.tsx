"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { Chrome, Eye, EyeOff, Github, Loader2, LogIn } from "lucide-react"
import { signIn as authSignIn } from "next-auth/react"
import { toast } from "sonner"

import { VerificationCodeInput } from "@/components/shared/auth/verification-code-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function getAuthErrorMessage(code: string | null) {
  switch (code) {
    case "OAuthSignin":
    case "OAuthCallback":
      return "Social login failed to start. Check OAuth redirect URLs and client secrets."
    case "OAuthAccountNotLinked":
      return "This email is already linked to another sign-in method."
    case "AccessDenied":
      return "Access was denied by the provider."
    case "Configuration":
      return "Auth provider is misconfigured. Check environment variables."
    default:
      return ""
  }
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/chat"
  const oauthErrorCode = searchParams.get("error")
  const oauthErrorMessage = getAuthErrorMessage(oauthErrorCode)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [authStep, setAuthStep] = useState<"credentials" | "verification">("credentials")
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null)
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const lastAttemptedCodeRef = useRef("")

  const countdown = verificationExpiresAt ? Math.max(0, Math.ceil((verificationExpiresAt - nowMs) / 1000)) : 0

  useEffect(() => {
    if (authStep !== "verification" || !verificationExpiresAt) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [authStep, verificationExpiresAt])

  const requestCode = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password first.")
      return false
    }

    setError("")
    setIsSendingCode(true)

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to send code")
      }

      const payload = (await response.json()) as { expiresAt?: string }
      const expiresAtMs = payload.expiresAt ? new Date(payload.expiresAt).getTime() : Date.now() + 60_000
      toast.success("Verification code sent")
      setVerificationExpiresAt(expiresAtMs)
      setNowMs(Date.now())
      setAuthStep("verification")
      lastAttemptedCodeRef.current = ""
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send code"
      setError(message)
      toast.error(message)
      return false
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleCredentialsStart = async (event: React.FormEvent) => {
    event.preventDefault()
    await requestCode()
  }

  const handleCredentialsSignIn = async (codeToVerify: string) => {
    setError("")

    if (!/^\d{6}$/.test(codeToVerify)) {
      setError("Enter the 6-digit code sent to your email.")
      return
    }

    setIsLoading(true)

    try {
      const result = await authSignIn("credentials", {
        email,
        password,
        code: codeToVerify,
        redirect: false,
        callbackUrl: nextPath,
      })

      if (!result || result.error || !result.ok) {
        throw new Error("Invalid email, password, or verification code")
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
        throw new Error("Sign-in completed but session was not established. Please retry.")
      }

      const destination = result.url && !result.url.includes("/login") ? result.url : nextPath
      window.location.assign(destination)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in"
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithSocial = async (provider: "google" | "github") => {
    setError("")
    setCode("")
    setSocialLoading(provider)

    try {
      await authSignIn(provider, { callbackUrl: nextPath })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in"
      setError(message)
      toast.error(message)
    } finally {
      setSocialLoading(null)
    }
  }

  useEffect(() => {
    if (authStep !== "verification") return
    if (isLoading || countdown <= 0) return
    if (!/^\d{6}$/.test(code)) return
    if (lastAttemptedCodeRef.current === code) return

    lastAttemptedCodeRef.current = code
    void handleCredentialsSignIn(code)
  }, [authStep, code, countdown, isLoading])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#0f172a_40%,#020617_100%)] px-4 py-10">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-zinc-950/70 shadow-[0_32px_90px_rgba(0,0,0,0.45)] md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,#0f766e_0%,#0f172a_58%,#020617_100%)] p-8 md:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">blastermailer AI</p>
            <h1 className="mt-4 text-3xl font-semibold text-zinc-100">Run campaigns faster with AI templates and automation.</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Generate polished restaurant newsletters, manage audiences, and ship in minutes from one workspace.
            </p>
          </div>
          <div className="space-y-2 text-sm text-zinc-300">
            <p>• Social sign-in and email authentication</p>
            <p>• Ready-to-send themed templates</p>
            <p>• Campaign analytics and activity tracking</p>
          </div>
        </section>
        <Card className="rounded-none border-0 bg-zinc-950/88 text-zinc-100 shadow-none md:min-h-[620px]">
          {authStep === "credentials" ? (
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Continue to your campaign workspace.</CardDescription>
            </CardHeader>
          ) : null}
          <CardContent className="space-y-4 md:flex md:min-h-[480px] md:flex-col">
            {authStep === "credentials" ? (
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
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Email sign in (2 steps)</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <form className="space-y-3" onSubmit={handleCredentialsStart}>
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
                      placeholder="Password"
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
                  <Button type="submit" disabled={isSendingCode} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                    {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    {isSendingCode ? "Sending code..." : "Continue"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-8 fade-in space-y-4 duration-500 md:flex md:flex-1 md:flex-col md:justify-center">
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-semibold text-zinc-100">Enter Verification Code</h2>
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
                    disabled={isLoading || countdown <= 0}
                    autoFocus
                  />
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSendingCode || countdown > 0}
                    onClick={requestCode}
                    className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isSendingCode ? "Sending..." : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAuthStep("credentials")
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
              </div>
            )}

            {error || oauthErrorMessage ? (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error || oauthErrorMessage}
              </p>
            ) : null}

            {authStep === "credentials" ? (
              <>
                <p className="text-sm text-zinc-400">
                  No account yet?{" "}
                  <Link href="/signup" className="font-medium text-sky-300 hover:text-sky-200">
                    Create one
                  </Link>
                </p>
                <p className="text-sm text-zinc-400">
                  Forgot your password?{" "}
                  <Link href="/reset-password" className="font-medium text-sky-300 hover:text-sky-200">
                    Reset it
                  </Link>
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
