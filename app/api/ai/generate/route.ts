import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { generateAiText } from "@/lib/ai"
import { createJob } from "@/lib/jobs"
import { createMessage } from "@/lib/messaging"

function statusForAiError(message: string): number {
  const normalized = message.toLowerCase()
  if (
    normalized.includes("daily free ai limit reached") ||
    normalized.includes("daily free ai capacity is exhausted")
  ) {
    return 429
  }
  if (normalized.includes("no eligible ai provider available")) {
    return 503
  }
  if (normalized.includes("no daily provider caps are configured")) {
    return 503
  }
  if (normalized.includes("no ai provider api key configured")) {
    return 503
  }
  if (normalized.includes("all ai providers failed")) {
    return 502
  }
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
    model?: string
    provider?: string
    async?: boolean
  }

  const prompt = String(body.prompt ?? "").trim()
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 422 })
  }

  if (body.async) {
    const job = await createJob({
      userId: session.user.id,
      type: "ai_generate",
      payload: {
        prompt,
        system: body.system,
        model: body.model,
        provider: body.provider,
        userPlan: session.user.plan,
      },
    })

    return NextResponse.json({ job }, { status: 202 })
  }

  try {
    const result = await generateAiText({
      prompt,
      system: body.system,
      model: body.model,
      provider: body.provider,
      userId: session.user.id,
      userPlan: session.user.plan,
    })

    await createMessage({
      userId: session.user.id,
      role: "USER",
      content: prompt,
      channel: "ai",
    })

    const assistantMessage = await createMessage({
      userId: session.user.id,
      role: "ASSISTANT",
      content: result.text,
      channel: "ai",
      metadata: { model: result.model, provider: result.provider },
    })

    return NextResponse.json({
      text: result.text,
      model: result.model,
      provider: result.provider,
      message: assistantMessage,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed"
    return NextResponse.json({ error: message }, { status: statusForAiError(message) })
  }
}
