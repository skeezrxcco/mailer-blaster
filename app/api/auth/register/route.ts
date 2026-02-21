import { NextResponse } from "next/server"

import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { recordAuthEvent } from "@/lib/auth-security"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { requestPendingSignupCode } from "@/lib/pending-signup"
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
      name?: string
      email?: string
      password?: string
    }

    const name = body.name?.trim() ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const password = body.password ?? ""

    const ipRate = checkRateLimit({
      key: buildRateLimitKey(["register", "ip", ipAddress]),
      limit: 12,
      windowSeconds: 60 * 60,
    })
    if (!ipRate.allowed) {
      await recordAuthEvent({
        type: "register_rate_limited",
        severity: "warn",
        email,
        ipAddress,
        userAgent,
        metadata: { retryAfterSeconds: ipRate.retryAfterSeconds, scope: "ip" },
      })
      return NextResponse.json(
        { error: `Too many registration attempts. Try again in ${ipRate.retryAfterSeconds}s.` },
        { status: 429 },
      )
    }

    const emailRate = checkRateLimit({
      key: buildRateLimitKey(["register", "email", email]),
      limit: 5,
      windowSeconds: 60 * 60,
    })
    if (!emailRate.allowed) {
      await recordAuthEvent({
        type: "register_rate_limited",
        severity: "warn",
        email,
        ipAddress,
        userAgent,
        metadata: { retryAfterSeconds: emailRate.retryAfterSeconds, scope: "email" },
      })
      return NextResponse.json(
        { error: `Too many attempts for this email. Try again in ${emailRate.retryAfterSeconds}s.` },
        { status: 429 },
      )
    }

    if (name.length < 2) {
      return NextResponse.json({ error: "Name must have at least 2 characters" }, { status: 422 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email" }, { status: 422 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must have at least 8 characters" }, { status: 422 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (existingUser?.passwordHash) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const codeResult = await requestPendingSignupCode({
      name,
      email,
      password,
    })

    if (!codeResult.sent) {
      return NextResponse.json(
        { error: `Please wait ${codeResult.waitSeconds}s before requesting another code.` },
        { status: 429 },
      )
    }

    return NextResponse.json({
      codeSent: true,
      expiresAt: codeResult.expiresAt.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
