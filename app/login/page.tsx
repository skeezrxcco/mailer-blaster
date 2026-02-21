"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Chrome, Eye, EyeOff, Github, Loader2, LogIn } from "lucide-react"
import { signIn as authSignIn } from "next-auth/react"

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/chat"
  const oauthErrorCode = searchParams.get("error")
  const oauthErrorMessage = getAuthErrorMessage(oauthErrorCode)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [authStep, setAuthStep] = useState<"credentials" | "verification">("credentials")
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null)

  const requestCode = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password first.")
      return false
    }

    setError("")
    setNotice("")
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

      setNotice("Verification code sent. Check your email and enter the 6-digit code.")
      setAuthStep("verification")
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send code")
      return false
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleCredentialsStart = async (event: React.FormEvent) => {
    event.preventDefault()
    await requestCode()
  }

  const handleCredentialsSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNotice("")

    if (!code.trim()) {
      setError("Enter the 6-digit code sent to your email.")
      return
    }

    setIsLoading(true)

    try {
      const result = await authSignIn("credentials", {
        email,
        password,
        code,
        redirect: false,
        callbackUrl: nextPath,
      })

      if (result?.error) {
        throw new Error("Invalid email, password, or verification code")
      }

      router.push(result?.url ?? nextPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithSocial = async (provider: "google" | "github") => {
    setError("")
    setSocialLoading(provider)

    try {
      await authSignIn(provider, { callbackUrl: nextPath })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setSocialLoading(null)
    }
  }

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
        <Card className="rounded-none border-0 bg-zinc-950/88 text-zinc-100 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Continue to your campaign workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {authStep === "credentials" ? (
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
            ) : (
              <form className="space-y-3" onSubmit={handleCredentialsSignIn}>
                <Input value={email} readOnly className="h-11 border-zinc-700 bg-zinc-900 text-zinc-400" />
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit verification code"
                  className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                  inputMode="numeric"
                  required
                />
                <Button type="submit" disabled={isLoading} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingCode}
                  onClick={requestCode}
                  className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                >
                  {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSendingCode ? "Sending code..." : "Resend code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAuthStep("credentials")
                    setCode("")
                    setError("")
                    setNotice("")
                  }}
                  className="h-10 w-full text-zinc-300 hover:bg-zinc-900/60 hover:text-zinc-100"
                >
                  Back to email and password
                </Button>
              </form>
            )}

            {error || oauthErrorMessage ? (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error || oauthErrorMessage}
              </p>
            ) : null}
            {notice ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}

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
