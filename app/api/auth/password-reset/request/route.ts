import { NextResponse } from "next/server"

import { createAndSendAuthCode } from "@/lib/auth-code"
import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { recordAuthEvent } from "@/lib/auth-security"
import { prisma } from "@/lib/prisma"
import { extractClientIp, extractUserAgent } from "@/lib/request-context"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  await ensureDevAuthSchema()

  const ipAddress = extractClientIp(request.headers)
  const userAgent = extractUserAgent(request.headers)

  const body = (await request.json()) as { email?: string }
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase()

  const genericResponse = NextResponse.json({
    ok: true,
    message: "If the account exists, a reset code has been sent.",
  })

  if (!isValidEmail(email)) {
    return genericResponse
  }

  const ipRate = checkRateLimit({
    key: buildRateLimitKey(["password-reset-request", "ip", ipAddress]),
    limit: 25,
    windowSeconds: 15 * 60,
  })
  if (!ipRate.allowed) {
    await recordAuthEvent({
      type: "password_reset_request_rate_limited",
      severity: "warn",
      email,
      ipAddress,
      userAgent,
      metadata: { scope: "ip", retryAfterSeconds: ipRate.retryAfterSeconds },
    })
    return NextResponse.json({ error: `Too many requests. Try again in ${ipRate.retryAfterSeconds}s.` }, { status: 429 })
  }

  const emailRate = checkRateLimit({
    key: buildRateLimitKey(["password-reset-request", "email", email]),
    limit: 6,
    windowSeconds: 15 * 60,
  })
  if (!emailRate.allowed) {
    await recordAuthEvent({
      type: "password_reset_request_rate_limited",
      severity: "warn",
      email,
      ipAddress,
      userAgent,
      metadata: { scope: "email", retryAfterSeconds: emailRate.retryAfterSeconds },
    })
    return NextResponse.json({ error: `Too many requests for this email. Try again in ${emailRate.retryAfterSeconds}s.` }, { status: 429 })
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
    await recordAuthEvent({
      type: "password_reset_requested_unknown_or_social_email",
      severity: "info",
      email,
      ipAddress,
      userAgent,
    })
    return genericResponse
  }

  await createAndSendAuthCode({
    userId: user.id,
    email: user.email ?? email,
    purpose: "password_reset",
  })

  await recordAuthEvent({
    type: "password_reset_code_sent",
    severity: "info",
    userId: user.id,
    email,
    ipAddress,
    userAgent,
  })

  return genericResponse
}
