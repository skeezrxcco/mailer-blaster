import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; name?: string }
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const name = String(body.name ?? "").trim() || null

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 422 })
    }

    const existing = await prisma.waitingList.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ ok: true, alreadyJoined: true })
    }

    const userAgent = request.headers.get("user-agent")
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null

    await prisma.waitingList.create({
      data: {
        email,
        name,
        source: "landing-page",
        userAgent,
        ipAddress,
      },
    })

    return NextResponse.json({ ok: true, alreadyJoined: false }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to join waitlist"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

