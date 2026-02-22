import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import {
  getLatestWorkflowSession,
  getWorkflowSessionByConversationId,
  listWorkflowSessions,
  loadOrCreateWorkflowSession,
} from "@/lib/ai/workflow-store"

function mapSessionPayload(session: {
  conversationId: string
  state: { state: string; intent: string; selectedTemplateId: string | null; recipientStats: unknown; summary: string | null; context: unknown }
  lastActivityAt: Date
}) {
  return {
    conversationId: session.conversationId,
    state: session.state.state,
    intent: session.state.intent,
    selectedTemplateId: session.state.selectedTemplateId,
    recipientStats: session.state.recipientStats,
    summary: session.state.summary,
    context: session.state.context,
    lastActivityAt: session.lastActivityAt,
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")

  const [selected, sessions] = await Promise.all([
    conversationId
      ? getWorkflowSessionByConversationId({ userId: session.user.id, conversationId })
      : getLatestWorkflowSession(session.user.id),
    listWorkflowSessions({ userId: session.user.id }),
  ])

  if (!selected) {
    return NextResponse.json({
      session: null,
      sessions,
      checkpoint: null,
    })
  }

  return NextResponse.json({
    session: mapSessionPayload(selected.session),
    sessions,
    checkpoint: selected.lastCheckpoint
      ? {
          state: selected.lastCheckpoint.state,
          payload: selected.lastCheckpoint.payload,
          createdAt: selected.lastCheckpoint.createdAt,
        }
      : null,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { conversationId?: string | null } = {}
  try {
    body = (await request.json()) as { conversationId?: string | null }
  } catch {
    body = {}
  }

  const conversationId = String(body.conversationId ?? "").trim() || null
  const created = await loadOrCreateWorkflowSession({
    userId: session.user.id,
    conversationId,
  })

  const sessions = await listWorkflowSessions({ userId: session.user.id })

  return NextResponse.json({
    session: mapSessionPayload(created),
    sessions,
  })
}
