import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { recordAuthEvent } from "@/lib/auth-security"
import { createAndSendAuthCode } from "@/lib/auth-code"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { hashPassword } from "@/lib/password"
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

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
      },
    })

    const codeResult = await createAndSendAuthCode({
      userId: user.id,
      email,
      purpose: "login",
    })

    return NextResponse.json({
      user,
      codeSent: codeResult.sent,
      expiresAt: codeResult.sent ? codeResult.expiresAt.toISOString() : null,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : "Unable to create account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
