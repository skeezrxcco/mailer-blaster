import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import { createJob } from "@/lib/jobs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    to?: string
    subject?: string
    html?: string
    text?: string
    from?: string
    queue?: boolean
  }

  const to = String(body.to ?? "").trim()
  const subject = String(body.subject ?? "").trim()
  const html = body.html ? String(body.html) : undefined
  const text = body.text ? String(body.text) : undefined
  const from = body.from ? String(body.from) : undefined

  if (!to || !subject) {
    return NextResponse.json({ error: "`to` and `subject` are required" }, { status: 422 })
  }

  if (body.queue !== false) {
    const job = await createJob({
      userId: session.user.id,
      type: "send_email",
      payload: { to, subject, html, text, from },
    })
    return NextResponse.json({ queued: true, job }, { status: 202 })
  }

  const sent = await sendEmail({ to, subject, html, text, from })
  await prisma.emailMessage.create({
    data: {
      userId: session.user.id,
      toEmail: to,
      fromEmail: from ?? process.env.EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? "no-reply@mailerblaster.ai",
      subject,
      htmlBody: html,
      textBody: text,
      provider: sent.provider,
      providerId: sent.id ?? null,
      status: "SENT",
      sentAt: new Date(),
    },
  })

  return NextResponse.json({
    queued: false,
    provider: sent.provider,
    providerId: sent.id ?? null,
  })
}
