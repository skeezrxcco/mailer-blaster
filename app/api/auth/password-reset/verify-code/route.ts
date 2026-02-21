import { NextResponse } from "next/server"

import { isAuthCodeValid } from "@/lib/auth-code"
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

  const body = (await request.json()) as {
    email?: string
    code?: string
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase()
  const code = String(body.code ?? "").trim()

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 422 })
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Code must have 6 digits." }, { status: 422 })
  }

  const rate = checkRateLimit({
    key: buildRateLimitKey(["password-reset-verify-code", ipAddress, email]),
    limit: 20,
    windowSeconds: 15 * 60,
  })

  if (!rate.allowed) {
    await recordAuthEvent({
      type: "password_reset_verify_rate_limited",
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
    return NextResponse.json({ error: "Invalid reset code or email." }, { status: 401 })
  }

  const validCode = await isAuthCodeValid({
    userId: user.id,
    purpose: "password_reset",
    code,
  })

  if (!validCode) {
    return NextResponse.json({ error: "Invalid reset code or email." }, { status: 401 })
  }

  await recordAuthEvent({
    type: "password_reset_code_validated",
    severity: "info",
    userId: user.id,
    email,
    ipAddress,
    userAgent,
  })

  return NextResponse.json({ ok: true })
}
