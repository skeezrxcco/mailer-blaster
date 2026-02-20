import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { createAndSendAuthCode } from "@/lib/auth-code"
import { hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
    }

    const name = body.name?.trim() ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const password = body.password ?? ""

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
