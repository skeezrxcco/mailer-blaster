import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { orchestrateAiChatStream } from "@/lib/ai/orchestrator"
import { normalizeAiModelMode } from "@/lib/ai/model-mode"

function formatSseEvent(event: Record<string, unknown>) {
  const eventName = String(event.type ?? "message")
  return `event: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await request.json()) as {
    prompt?: string
    conversationId?: string
    mode?: string
    provider?: string
    model?: string
    system?: string
  }

  const prompt = String(body.prompt ?? "").trim()
  if (!prompt) {
    return new Response("Prompt is required", { status: 422 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of orchestrateAiChatStream({
          userId: session.user.id,
          userPlan: session.user.plan,
          prompt,
          conversationId: body.conversationId,
          mode: normalizeAiModelMode(body.mode),
          provider: body.provider,
          model: body.model,
          system: body.system,
        })) {
          controller.enqueue(encoder.encode(formatSseEvent(event as unknown as Record<string, unknown>)))
        }
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI stream failed"
        controller.enqueue(
          encoder.encode(
            formatSseEvent({
              type: "error",
              error: message,
            }),
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
