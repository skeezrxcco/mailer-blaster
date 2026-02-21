import { createHash, randomInt } from "crypto"

import { sendEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

const AUTH_CODE_TTL_SECONDS = Number(process.env.AUTH_CODE_TTL_SECONDS ?? "60")
const AUTH_CODE_RESEND_COOLDOWN_SECONDS = Number(process.env.AUTH_CODE_RESEND_COOLDOWN_SECONDS ?? "30")
export type AuthCodePurpose = "login" | "password_reset"

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex")
}

export function generateSixDigitCode() {
  return generateCode(6)
}

function generateCode(length = 6) {
  const max = 10 ** length
  return randomInt(0, max)
    .toString()
    .padStart(length, "0")
}

function expiresAtFromNow(ttlSeconds = AUTH_CODE_TTL_SECONDS) {
  return new Date(Date.now() + ttlSeconds * 1000)
}

export async function createAuthCodeRecord(input: {
  userId: string
  purpose: AuthCodePurpose
  code: string
  ttlSeconds?: number
  ttlMinutes?: number
}) {
  const ttlSeconds = input.ttlSeconds ?? (input.ttlMinutes ? input.ttlMinutes * 60 : AUTH_CODE_TTL_SECONDS)

  await prisma.authCode.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      codeHash: hashCode(input.code),
      expiresAt: expiresAtFromNow(ttlSeconds),
    },
  })
}

export async function createAndSendAuthCode(input: {
  userId: string
  email: string
  purpose: AuthCodePurpose
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

  const code = generateSixDigitCode()
  const codeHash = hashCode(code)
  const expiresAt = expiresAtFromNow(AUTH_CODE_TTL_SECONDS)

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
    subject: input.purpose === "password_reset" ? "Your password reset code" : "Your verification code",
    html:
      input.purpose === "password_reset"
        ? `<p>Use this code to reset your password:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>This code expires in ${AUTH_CODE_TTL_SECONDS} seconds. If you did not request this, you can ignore this email.</p>`
        : `<p>Your verification code is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>This code expires in ${AUTH_CODE_TTL_SECONDS} seconds.</p>`,
    text:
      input.purpose === "password_reset"
        ? `Use this code to reset your password: ${code}. It expires in ${AUTH_CODE_TTL_SECONDS} seconds.`
        : `Your verification code is ${code}. It expires in ${AUTH_CODE_TTL_SECONDS} seconds.`,
  })

  return {
    sent: true as const,
    expiresAt,
  }
}

export async function verifyAndConsumeAuthCode(input: {
  userId: string
  purpose: AuthCodePurpose
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

export async function isAuthCodeValid(input: {
  userId: string
  purpose: AuthCodePurpose
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
    select: {
      id: true,
    },
  })

  return Boolean(matched)
}
