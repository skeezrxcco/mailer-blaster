import { NextResponse } from "next/server"

import { verifyAndConsumeAuthCode } from "@/lib/auth-code"
import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { invalidateUserSessions, recordAuthEvent, registerAuthFailureAndInvalidateIfNeeded } from "@/lib/auth-security"
import { hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { extractClientIp, extractUserAgent } from "@/lib/request-context"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  await ensureDevAuthSchema()

  const ipAddress = extractClientIp(request.headers)
  const userAgent = extractUserAgent(request.headers)

  const body = (await request.json()) as {
    email?: string
    code?: string
    newPassword?: string
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase()
  const code = String(body.code ?? "").trim()
  const newPassword = String(body.newPassword ?? "")

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 422 })
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Code must have 6 digits." }, { status: 422 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must have at least 8 characters." }, { status: 422 })
  }

  const rate = checkRateLimit({
    key: buildRateLimitKey(["password-reset-confirm", ipAddress, email]),
    limit: 10,
    windowSeconds: 15 * 60,
  })

  if (!rate.allowed) {
    await recordAuthEvent({
      type: "password_reset_confirm_rate_limited",
      severity: "warn",
      email,
      ipAddress,
      userAgent,
      metadata: { retryAfterSeconds: rate.retryAfterSeconds },
    })
    return NextResponse.json({ error: `Too many attempts. Try again in ${rate.retryAfterSeconds}s.` }, { status: 429 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  })
  if (!user?.passwordHash) {
    await registerAuthFailureAndInvalidateIfNeeded({
      email,
      ipAddress,
      userAgent,
      reason: "password-reset-confirm-user-not-found",
    })
    return NextResponse.json({ error: "Invalid reset code or email." }, { status: 401 })
  }

  const isCodeValid = await verifyAndConsumeAuthCode({
    userId: user.id,
    purpose: "password_reset",
    code,
  })

  if (!isCodeValid) {
    await registerAuthFailureAndInvalidateIfNeeded({
      userId: user.id,
      email,
      ipAddress,
      userAgent,
      reason: "password-reset-confirm-invalid-code",
    })
    return NextResponse.json({ error: "Invalid reset code or email." }, { status: 401 })
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      emailVerified: new Date(),
    },
  })

  await invalidateUserSessions(user.id, "password-reset")
  await recordAuthEvent({
    type: "password_reset_success",
    severity: "info",
    userId: user.id,
    email,
    ipAddress,
    userAgent,
  })

  return NextResponse.json({ ok: true })
}
