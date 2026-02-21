import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { recordAuthEvent } from "@/lib/auth-security"
import { createSignupLoginCode, verifyPendingSignupCode } from "@/lib/pending-signup"
import { prisma } from "@/lib/prisma"
import { extractClientIp, extractUserAgent } from "@/lib/request-context"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    await ensureDevAuthSchema()

    const ipAddress = extractClientIp(request.headers)
    const userAgent = extractUserAgent(request.headers)

    const body = (await request.json()) as {
      email?: string
      code?: string
    }

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const code = String(body.code ?? "").trim()

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email" }, { status: 422 })
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Code must have 6 digits" }, { status: 422 })
    }

    const rate = checkRateLimit({
      key: buildRateLimitKey(["register-verify", ipAddress, email]),
      limit: 10,
      windowSeconds: 10 * 60,
    })
    if (!rate.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rate.retryAfterSeconds}s.` }, { status: 429 })
    }

    const pending = verifyPendingSignupCode({ email, code })
    if (!pending) {
      await recordAuthEvent({
        type: "signup_verify_failed",
        severity: "warn",
        email,
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 })
    }

    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
      },
    })

    const loginCode = await createSignupLoginCode(user.id)

    return NextResponse.json({
      ok: true,
      loginCode,
      email: user.email,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : "Unable to verify code"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
