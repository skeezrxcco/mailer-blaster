import nodemailer from "nodemailer"

export type SendEmailInput = {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
}

export type SendEmailResult = {
  provider: "resend" | "smtp"
  id?: string
}

const defaultFrom = process.env.EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? "no-reply@mailerblaster.ai"

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_API_KEY
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY or AUTH_RESEND_API_KEY")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from ?? defaultFrom,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Resend error (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as { id?: string }
  return {
    provider: "resend",
    id: payload.id,
  }
}

async function sendWithSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || "587")
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host) {
    throw new Error("Missing SMTP_HOST")
  }

  if ((user && !pass) || (!user && pass)) {
    throw new Error("When using SMTP auth, both SMTP_USER and SMTP_PASS are required")
  }

  const auth = user && pass ? { user, pass } : undefined

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    ...(auth ? { auth } : {}),
  })

  const result = await transporter.sendMail({
    from: input.from ?? defaultFrom,
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

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const hasResend = Boolean(process.env.RESEND_API_KEY || process.env.AUTH_RESEND_API_KEY)

  if (hasResend) {
    return sendWithResend(input)
  }

  return sendWithSmtp(input)
}
