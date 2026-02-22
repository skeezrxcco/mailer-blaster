import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { getJobStatus, subscribeToJobProgress, type EmailQueueProgressEvent } from "@/lib/email-queue"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const url = new URL(request.url)
  const jobId = url.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 422 })
  }

  const job = getJobStatus(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({
      jobId: job.id,
      campaignId: job.campaignId,
      status: job.status,
      progress: job.progress,
      completedAt: job.completedAt?.toISOString() ?? null,
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: EmailQueueProgressEvent) => {
        const data = JSON.stringify(event)
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      sendEvent({
        jobId: job.id,
        campaignId: job.campaignId,
        recipientEmail: "",
        status: "sent",
        progress: { ...job.progress },
      })

      const unsubscribe = subscribeToJobProgress(jobId, (event) => {
        try {
          sendEvent(event)

          const isDone =
            event.progress.sent + event.progress.failed >= event.progress.total
          if (isDone) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "complete", progress: event.progress })}\n\n`,
              ),
            )
            controller.close()
            unsubscribe()
          }
        } catch {
          unsubscribe()
        }
      })

      request.signal.addEventListener("abort", () => {
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
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
