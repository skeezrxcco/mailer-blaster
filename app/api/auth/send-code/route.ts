import { NextResponse } from "next/server"

import { createAndSendAuthCode } from "@/lib/auth-code"
import { verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const password = String(body.password ?? "")

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
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const codeResult = await createAndSendAuthCode({
      userId: user.id,
      email: user.email ?? email,
      purpose: "login",
    })

    if (!codeResult.sent) {
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
