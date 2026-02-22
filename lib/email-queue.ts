import { sendEmail, type SendEmailResult } from "@/lib/email"
import nodemailer from "nodemailer"

export type SmtpSource = "platform" | "user" | "dedicated"

export type SmtpConfig = {
  source: SmtpSource
  host?: string
  port?: number
  user?: string
  pass?: string
  from?: string
}

export type QueuedRecipient = {
  email: string
  status: "pending" | "sending" | "sent" | "failed"
  error?: string
  messageId?: string
  sentAt?: Date
}

export type EmailQueueJob = {
  id: string
  campaignId: string
  userId: string
  subject: string
  html?: string
  text?: string
  from?: string
  smtpConfig: SmtpConfig
  recipients: QueuedRecipient[]
  status: "queued" | "processing" | "completed" | "failed"
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  progress: {
    total: number
    sent: number
    failed: number
  }
}

export type EmailQueueProgressEvent = {
  jobId: string
  campaignId: string
  recipientEmail: string
  status: "sent" | "failed"
  error?: string
  progress: EmailQueueJob["progress"]
}

type ProgressCallback = (event: EmailQueueProgressEvent) => void

const activeJobs = new Map<string, EmailQueueJob>()
const progressListeners = new Map<string, Set<ProgressCallback>>()

function generateJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function buildUserSmtpTransporter(config: SmtpConfig) {
  if (!config.host) {
    throw new Error("User SMTP requires host configuration")
  }

  const port = config.port ?? 587
  const auth = config.user && config.pass ? { user: config.user, pass: config.pass } : undefined

  return nodemailer.createTransport({
    host: config.host,
    port,
    secure: port === 465,
    ...(auth ? { auth } : {}),
  })
}

async function sendWithUserSmtp(
  config: SmtpConfig,
  input: { to: string; subject: string; html?: string; text?: string; from?: string },
): Promise<SendEmailResult> {
  const transporter = buildUserSmtpTransporter(config)
  const result = await transporter.sendMail({
    from: input.from ?? config.from ?? process.env.EMAIL_FROM ?? "no-reply@blastermailer.ai",
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return {
    provider: "smtp",
    id: result.messageId,
  }
}

async function sendSingleEmail(
  smtpConfig: SmtpConfig,
  input: { to: string; subject: string; html?: string; text?: string; from?: string },
): Promise<SendEmailResult> {
  if (smtpConfig.source === "user") {
    return sendWithUserSmtp(smtpConfig, input)
  }

  return sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.from ?? smtpConfig.from,
  })
}

function notifyProgress(jobId: string, event: EmailQueueProgressEvent) {
  const listeners = progressListeners.get(jobId)
  if (!listeners) return
  for (const callback of listeners) {
    try {
      callback(event)
    } catch {
      // Ignore listener errors
    }
  }
}

async function processJob(job: EmailQueueJob) {
  job.status = "processing"
  job.startedAt = new Date()

  const batchSize = Number(process.env.EMAIL_QUEUE_BATCH_SIZE) || 5
  const delayBetweenBatchesMs = Number(process.env.EMAIL_QUEUE_BATCH_DELAY_MS) || 1000
  const delayBetweenEmailsMs = Number(process.env.EMAIL_QUEUE_EMAIL_DELAY_MS) || 200

  const pendingRecipients = job.recipients.filter((r) => r.status === "pending")

  for (let i = 0; i < pendingRecipients.length; i += batchSize) {
    const batch = pendingRecipients.slice(i, i + batchSize)

    for (const recipient of batch) {
      recipient.status = "sending"

      try {
        const result = await sendSingleEmail(job.smtpConfig, {
          to: recipient.email,
          subject: job.subject,
          html: job.html,
          text: job.text,
          from: job.from,
        })

        recipient.status = "sent"
        recipient.messageId = result.id
        recipient.sentAt = new Date()
        job.progress.sent += 1
      } catch (error) {
        recipient.status = "failed"
        recipient.error = error instanceof Error ? error.message : "Send failed"
        job.progress.failed += 1
      }

      notifyProgress(job.id, {
        jobId: job.id,
        campaignId: job.campaignId,
        recipientEmail: recipient.email,
        status: recipient.status as "sent" | "failed",
        error: recipient.error,
        progress: { ...job.progress },
      })

      if (delayBetweenEmailsMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenEmailsMs))
      }
    }

    if (i + batchSize < pendingRecipients.length && delayBetweenBatchesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs))
    }
  }

  const hasFailures = job.progress.failed > 0
  const allFailed = job.progress.failed === job.progress.total
  job.status = allFailed ? "failed" : "completed"
  job.completedAt = new Date()

  progressListeners.delete(job.id)
}

export function enqueueEmailJob(input: {
  campaignId: string
  userId: string
  subject: string
  html?: string
  text?: string
  from?: string
  smtpConfig: SmtpConfig
  recipientEmails: string[]
}): EmailQueueJob {
  const jobId = generateJobId()

  const recipients: QueuedRecipient[] = input.recipientEmails.map((email) => ({
    email,
    status: "pending",
  }))

  const job: EmailQueueJob = {
    id: jobId,
    campaignId: input.campaignId,
    userId: input.userId,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.from,
    smtpConfig: input.smtpConfig,
    recipients,
    status: "queued",
    createdAt: new Date(),
    progress: {
      total: recipients.length,
      sent: 0,
      failed: 0,
    },
  }

  activeJobs.set(jobId, job)

  setImmediate(() => {
    processJob(job).catch(() => {
      job.status = "failed"
      job.completedAt = new Date()
    })
  })

  return job
}

export function getJobStatus(jobId: string): EmailQueueJob | null {
  return activeJobs.get(jobId) ?? null
}

export function subscribeToJobProgress(jobId: string, callback: ProgressCallback): () => void {
  if (!progressListeners.has(jobId)) {
    progressListeners.set(jobId, new Set())
  }
  progressListeners.get(jobId)!.add(callback)

  return () => {
    const listeners = progressListeners.get(jobId)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        progressListeners.delete(jobId)
      }
    }
  }
}

export function getActiveJobsForUser(userId: string): EmailQueueJob[] {
  return Array.from(activeJobs.values()).filter(
    (job) => job.userId === userId && (job.status === "queued" || job.status === "processing"),
  )
}
