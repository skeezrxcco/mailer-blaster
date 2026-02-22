import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { orchestrateAiChatStream } from "@/lib/ai/orchestrator"
import { normalizeAiModelMode } from "@/lib/ai/model-mode"
import type { AiStreamEvent } from "@/lib/ai/types"

function statusForAiError(message: string): number {
  const normalized = message.toLowerCase()
  if (normalized.includes("limit") || normalized.includes("rate")) return 429
  if (normalized.includes("credit")) return 429
  if (normalized.includes("unauthorized")) return 401
  if (normalized.includes("provider") || normalized.includes("service")) return 503
  return 500
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    prompt?: string
    system?: string
    mode?: string
    model?: string
    provider?: string
    conversationId?: string
  }

  const prompt = String(body.prompt ?? "").trim()
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 422 })
  }

  try {
    let doneEvent: Extract<AiStreamEvent, { type: "done" }> | null = null
    let sessionEvent: Extract<AiStreamEvent, { type: "session" }> | null = null

    for await (const event of orchestrateAiChatStream({
      userId: session.user.id,
      userPlan: session.user.plan,
      prompt,
      conversationId: body.conversationId,
      mode: normalizeAiModelMode(body.mode),
      model: body.model,
      provider: body.provider,
      system: body.system,
    })) {
      if (event.type === "session") {
        sessionEvent = event
      }
      if (event.type === "done") {
        doneEvent = event
      }
    }

    if (!doneEvent) {
      throw new Error("AI orchestration finished without a completion payload.")
    }

    return NextResponse.json({
      text: doneEvent.text,
      conversationId: doneEvent.conversationId ?? sessionEvent?.conversationId ?? body.conversationId ?? null,
      state: doneEvent.state,
      intent: doneEvent.intent,
      selectedTemplateId: doneEvent.selectedTemplateId ?? null,
      templateSuggestions: doneEvent.templateSuggestions ?? [],
      recipientStats: doneEvent.recipientStats ?? null,
      campaignId: doneEvent.campaignId ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed"
    return NextResponse.json({ error: message }, { status: statusForAiError(message) })
  }
}
