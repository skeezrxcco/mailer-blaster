import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { MessageRole } from "@prisma/client"

import { authOptions } from "@/lib/auth"
import { createMessage, listMessages } from "@/lib/messaging"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel") ?? "chat"
  const limit = Number(searchParams.get("limit") ?? "50")

  const messages = await listMessages({
    userId: session.user.id,
    channel,
    limit,
  })

  return NextResponse.json({ messages: messages.reverse() })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    role?: string
    content?: string
    channel?: string
    conversationId?: string
    metadata?: Record<string, unknown>
  }

  const roleInput = String(body.role ?? "USER").toUpperCase()
  const role = roleInput in MessageRole ? (MessageRole[roleInput as keyof typeof MessageRole] as MessageRole) : MessageRole.USER
  const content = String(body.content ?? "").trim()

  if (!content) {
    return NextResponse.json({ error: "Message content is required" }, { status: 422 })
  }

  const message = await createMessage({
    userId: session.user.id,
    role,
    content,
    channel: body.channel ?? "chat",
    conversationId: body.conversationId ?? null,
    metadata: body.metadata ?? null,
  })

  return NextResponse.json({ message })
}
