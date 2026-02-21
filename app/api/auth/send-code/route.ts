import { NextResponse } from "next/server"

import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { recordAuthEvent, registerAuthFailureAndInvalidateIfNeeded } from "@/lib/auth-security"
import { createAndSendAuthCode } from "@/lib/auth-code"
import { verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { extractClientIp, extractUserAgent } from "@/lib/request-context"

export async function POST(request: Request) {
  try {
    await ensureDevAuthSchema()

    const ipAddress = extractClientIp(request.headers)
    const userAgent = extractUserAgent(request.headers)

    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const password = String(body.password ?? "")

    const ipRate = checkRateLimit({
      key: buildRateLimitKey(["send-code", "ip", ipAddress]),
      limit: 20,
      windowSeconds: 15 * 60,
    })
    if (!ipRate.allowed) {
      await recordAuthEvent({
        type: "send_code_rate_limited",
        severity: "warn",
        email,
        ipAddress,
        userAgent,
        metadata: { retryAfterSeconds: ipRate.retryAfterSeconds, scope: "ip" },
      })
      return NextResponse.json({ error: `Too many requests. Try again in ${ipRate.retryAfterSeconds}s.` }, { status: 429 })
    }

    const emailRate = checkRateLimit({
      key: buildRateLimitKey(["send-code", "email", email]),
      limit: 6,
      windowSeconds: 15 * 60,
    })
    if (!emailRate.allowed) {
      await recordAuthEvent({
        type: "send_code_rate_limited",
        severity: "warn",
        email,
        ipAddress,
        userAgent,
        metadata: { retryAfterSeconds: emailRate.retryAfterSeconds, scope: "email" },
      })
      return NextResponse.json({ error: `Too many requests for this email. Try again in ${emailRate.retryAfterSeconds}s.` }, { status: 429 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 422 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    })

    if (!user?.passwordHash) {
      await registerAuthFailureAndInvalidateIfNeeded({
        email,
        ipAddress,
        userAgent,
        reason: "send-code-user-not-found",
      })
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      await registerAuthFailureAndInvalidateIfNeeded({
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        reason: "send-code-invalid-password",
      })
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const codeResult = await createAndSendAuthCode({
      userId: user.id,
      email: user.email ?? email,
      purpose: "login",
    })

    if (!codeResult.sent) {
      await recordAuthEvent({
        type: "send_code_cooldown_block",
        severity: "info",
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        metadata: { waitSeconds: codeResult.waitSeconds },
      })
      return NextResponse.json(
        { error: `Please wait ${codeResult.waitSeconds}s before requesting another code.` },
        { status: 429 },
      )
    }

    return NextResponse.json({
      ok: true,
      expiresAt: codeResult.expiresAt.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send verification code"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
