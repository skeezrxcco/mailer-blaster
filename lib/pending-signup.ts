import { createHash } from "crypto"

import { createAuthCodeRecord, generateSixDigitCode } from "@/lib/auth-code"
import { sendEmail } from "@/lib/email"
import { hashPassword } from "@/lib/password"

type PendingSignup = {
  name: string
  email: string
  passwordHash: string
  codeHash: string
  expiresAt: Date
  createdAt: Date
}

type PendingSignupRequestResult =
  | { sent: true; expiresAt: Date }
  | { sent: false; waitSeconds: number }

declare global {
  // eslint-disable-next-line no-var
  var __pendingSignupByEmail: Map<string, PendingSignup> | undefined
}

const SIGNUP_CODE_TTL_SECONDS = Number(process.env.SIGNUP_CODE_TTL_SECONDS ?? "60")
const SIGNUP_CODE_RESEND_COOLDOWN_SECONDS = Number(process.env.SIGNUP_CODE_RESEND_COOLDOWN_SECONDS ?? "60")

const pendingByEmail = global.__pendingSignupByEmail ?? new Map<string, PendingSignup>()
if (!global.__pendingSignupByEmail) {
  global.__pendingSignupByEmail = pendingByEmail
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex")
}

function pruneExpired(now: Date) {
  for (const [email, entry] of pendingByEmail.entries()) {
    if (entry.expiresAt.getTime() <= now.getTime()) {
      pendingByEmail.delete(email)
    }
  }
}

export async function requestPendingSignupCode(input: {
  name: string
  email: string
  password: string
}): Promise<PendingSignupRequestResult> {
  const now = new Date()
  pruneExpired(now)

  const existing = pendingByEmail.get(input.email)
  if (existing) {
    const waitMs = existing.createdAt.getTime() + SIGNUP_CODE_RESEND_COOLDOWN_SECONDS * 1000 - now.getTime()
    if (waitMs > 0) {
      return {
        sent: false,
        waitSeconds: Math.ceil(waitMs / 1000),
      }
    }
  }

  const passwordHash = await hashPassword(input.password)
  const code = generateSixDigitCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(now.getTime() + SIGNUP_CODE_TTL_SECONDS * 1000)

  pendingByEmail.set(input.email, {
    name: input.name,
    email: input.email,
    passwordHash,
    codeHash,
    expiresAt,
    createdAt: now,
  })

  await sendEmail({
    to: input.email,
    subject: "Your account verification code",
    html: `<p>Use this code to create your account:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>This code expires in ${SIGNUP_CODE_TTL_SECONDS} seconds.</p>`,
    text: `Use this code to create your account: ${code}. It expires in ${SIGNUP_CODE_TTL_SECONDS} seconds.`,
  })

  return {
    sent: true,
    expiresAt,
  }
}

export function verifyPendingSignupCode(input: {
  email: string
  code: string
}): PendingSignup | null {
  const now = new Date()
  pruneExpired(now)

  const pending = pendingByEmail.get(input.email)
  if (!pending) return null

  if (pending.expiresAt.getTime() <= now.getTime()) {
    pendingByEmail.delete(input.email)
    return null
  }

  if (hashCode(input.code.trim()) !== pending.codeHash) {
    return null
  }

  pendingByEmail.delete(input.email)
  return pending
}

export async function createSignupLoginCode(userId: string) {
  const loginCode = generateSixDigitCode()
  await createAuthCodeRecord({
    userId,
    purpose: "login",
    code: loginCode,
    ttlMinutes: 2,
  })
  return loginCode
}
