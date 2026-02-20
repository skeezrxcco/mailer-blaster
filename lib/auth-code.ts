import { createHash, randomInt } from "crypto"

import { sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const AUTH_CODE_TTL_MINUTES = Number(process.env.AUTH_CODE_TTL_MINUTES ?? "10")
const AUTH_CODE_RESEND_COOLDOWN_SECONDS = Number(process.env.AUTH_CODE_RESEND_COOLDOWN_SECONDS ?? "30")

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex")
}

function generateCode(length = 6) {
  const max = 10 ** length
  return randomInt(0, max)
    .toString()
    .padStart(length, "0")
}

function expiresAtFromNow() {
  return new Date(Date.now() + AUTH_CODE_TTL_MINUTES * 60 * 1000)
}

export async function createAndSendAuthCode(input: {
  userId: string
  email: string
  purpose: "login"
}) {
  const now = new Date()
  const latestCode = await prisma.authCode.findFirst({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  if (latestCode) {
    const waitMs = latestCode.createdAt.getTime() + AUTH_CODE_RESEND_COOLDOWN_SECONDS * 1000 - now.getTime()
    if (waitMs > 0) {
      return {
        sent: false as const,
        waitSeconds: Math.ceil(waitMs / 1000),
      }
    }
  }

  const code = generateCode(6)
  const codeHash = hashCode(code)
  const expiresAt = expiresAtFromNow()

  await prisma.authCode.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      codeHash,
      expiresAt,
    },
  })

  await sendEmail({
    to: input.email,
    subject: "Your verification code",
    html: `<p>Your verification code is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>This code expires in ${AUTH_CODE_TTL_MINUTES} minutes.</p>`,
    text: `Your verification code is ${code}. It expires in ${AUTH_CODE_TTL_MINUTES} minutes.`,
  })

  return {
    sent: true as const,
    expiresAt,
  }
}

export async function verifyAndConsumeAuthCode(input: {
  userId: string
  purpose: "login"
  code: string
}) {
  const normalizedCode = input.code.trim()
  if (!/^\d{6}$/.test(normalizedCode)) return false

  const codeHash = hashCode(normalizedCode)
  const now = new Date()

  const matched = await prisma.authCode.findFirst({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      codeHash,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  if (!matched) return false

  await prisma.authCode.update({
    where: { id: matched.id },
    data: {
      consumedAt: now,
    },
  })

  return true
}
