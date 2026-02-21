"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Chrome, Eye, EyeOff, Github, Loader2, UserPlus } from "lucide-react"
import { signIn as authSignIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null)

  const signUp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsLoading(true)

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
        throw new Error(payload.error || "Unable to create account")
      }

      setAwaitingVerification(true)
      setNotice("Account created. We sent a 6-digit verification code to your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const sendCode = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password first.")
      return
    }

    setIsSendingCode(true)
    setError("")
    setNotice("")

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

      setAwaitingVerification(true)
      setNotice("Verification code sent. Check your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send code")
    } finally {
      setIsSendingCode(false)
    }
  }

  const verifyAndContinue = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsVerifying(true)

    try {
      const signInResult = await authSignIn("credentials", {
        email,
        password,
        code,
        redirect: false,
        callbackUrl: "/chat",
      })
      if (signInResult?.error) {
        throw new Error("Invalid verification code.")
      }

      router.push(signInResult?.url ?? "/chat")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code")
    } finally {
      setIsVerifying(false)
    }
  }

  const signInWithSocial = async (provider: "google" | "github") => {
    setError("")
    setSocialLoading(provider)

    try {
      await authSignIn(provider, { callbackUrl: "/chat" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setSocialLoading(null)
    }
  }

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
        <Card className="rounded-none border-0 bg-zinc-950/88 text-zinc-100 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Start building campaigns with social or email sign up.</CardDescription>
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
              <span className="text-xs uppercase tracking-wide text-zinc-500">Or continue with email</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {!awaitingVerification ? (
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
            ) : (
              <form className="space-y-3" onSubmit={verifyAndContinue}>
                <Input value={email} readOnly className="h-11 border-zinc-700 bg-zinc-900 text-zinc-400" />
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit verification code"
                  className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                  inputMode="numeric"
                  required
                />
                <Button type="submit" disabled={isVerifying} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
                  {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isVerifying ? "Verifying..." : "Verify and continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingCode}
                  onClick={sendCode}
                  className="h-10 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                >
                  {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSendingCode ? "Sending code..." : "Resend code"}
                </Button>
              </form>
            )}

            {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
            {notice ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}

            <p className="text-sm text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-sky-300 hover:text-sky-200">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
