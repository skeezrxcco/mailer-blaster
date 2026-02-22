import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { enqueueEmailJob, type SmtpConfig, type SmtpSource } from "@/lib/email-queue"

function normalizeSmtpSource(value?: string): SmtpSource {
  const normalized = String(value ?? "platform").trim().toLowerCase()
  if (normalized === "user") return "user"
  if (normalized === "dedicated") return "dedicated"
  return "platform"
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    campaignId?: string
    subject?: string
    html?: string
    text?: string
    from?: string
    recipientEmails?: string[]
    smtpSource?: string
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    scheduledAt?: string
  }

  const campaignId = String(body.campaignId ?? `cmp-${Date.now().toString(36)}`).trim()
  const subject = String(body.subject ?? "").trim()
  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 422 })
  }

  const recipientEmails = (body.recipientEmails ?? []).filter(
    (email) => typeof email === "string" && email.includes("@"),
  )
  if (recipientEmails.length === 0) {
    return NextResponse.json({ error: "At least one recipient email is required" }, { status: 422 })
  }

  const smtpSource = normalizeSmtpSource(body.smtpSource)
  const smtpConfig: SmtpConfig = {
    source: smtpSource,
    from: body.from,
  }

  if (smtpSource === "user") {
    if (!body.smtpHost) {
      return NextResponse.json({ error: "SMTP host is required for custom SMTP" }, { status: 422 })
    }
    smtpConfig.host = body.smtpHost
    smtpConfig.port = body.smtpPort
    smtpConfig.user = body.smtpUser
    smtpConfig.pass = body.smtpPass
  }

  const job = enqueueEmailJob({
    campaignId,
    userId: session.user.id,
    subject,
    html: body.html,
    text: body.text,
    from: body.from,
    smtpConfig,
    recipientEmails,
  })

  return NextResponse.json({
    jobId: job.id,
    campaignId: job.campaignId,
    status: job.status,
    recipientCount: job.recipients.length,
    progress: job.progress,
  })
}
