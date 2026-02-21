import { Prisma, type Job, type JobStatus } from "@prisma/client"

import { generateAiText } from "@/lib/ai"
import { sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

type JsonRecord = Record<string, unknown>

type CreateJobInput = {
  type: string
  payload: JsonRecord
  userId?: string | null
  availableAt?: Date
}

export async function createJob(input: CreateJobInput) {
  return prisma.job.create({
    data: {
      type: input.type,
      payload: input.payload as Prisma.InputJsonValue,
      userId: input.userId ?? null,
      availableAt: input.availableAt ?? new Date(),
    },
  })
}

export async function getJobById(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId },
  })
}

export async function listJobs(input: {
  userId?: string | null
  status?: JobStatus
  limit?: number
}) {
  return prisma.job.findMany({
    where: {
      userId: input.userId ?? undefined,
      status: input.status ?? undefined,
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(input.limit ?? 50, 1), 200),
  })
}

async function processSendEmailJob(job: Job) {
  const payload = job.payload as JsonRecord
  const to = String(payload.to ?? "")
  const subject = String(payload.subject ?? "")
  const html = payload.html ? String(payload.html) : undefined
  const text = payload.text ? String(payload.text) : undefined
  const from = payload.from ? String(payload.from) : undefined

  if (!to || !subject) {
    throw new Error("send_email payload must include `to` and `subject`")
  }

  const result = await sendEmail({ to, subject, html, text, from })

  await prisma.emailMessage.create({
    data: {
      userId: job.userId,
      toEmail: to,
      fromEmail: from ?? process.env.EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? "no-reply@blastermailer.ai",
      subject,
      htmlBody: html,
      textBody: text,
      provider: result.provider,
      providerId: result.id ?? null,
      status: "SENT",
      sentAt: new Date(),
    },
  })

  return result
}

async function processAiGenerateJob(job: Job) {
  const payload = job.payload as JsonRecord
  const prompt = String(payload.prompt ?? "")
  const system = payload.system ? String(payload.system) : undefined
  const model = payload.model ? String(payload.model) : undefined
  const provider = payload.provider ? String(payload.provider) : undefined
  const userPlan = payload.userPlan ? String(payload.userPlan) : undefined

  if (!prompt.trim()) {
    throw new Error("ai_generate payload must include `prompt`")
  }

  return generateAiText({ prompt, system, model, provider, userId: job.userId ?? undefined, userPlan })
}

async function runJob(job: Job) {
  if (job.type === "send_email") return processSendEmailJob(job)
  if (job.type === "ai_generate") return processAiGenerateJob(job)

  throw new Error(`Unsupported job type: ${job.type}`)
}

export async function processPendingJobs(limit = 5) {
  const pendingJobs = await prisma.job.findMany({
    where: {
      status: "QUEUED",
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
  })

  const processed: Array<{ id: string; status: JobStatus; error?: string }> = []

  for (const job of pendingJobs) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })

    try {
      const result = await runJob(job)
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          result: result as Prisma.InputJsonValue,
          completedAt: new Date(),
          error: null,
        },
      })
      processed.push({ id: job.id, status: "COMPLETED" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job processing failed"
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: message,
          completedAt: new Date(),
        },
      })
      processed.push({ id: job.id, status: "FAILED", error: message })
    }
  }

  return processed
}
