import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

type AuthEventInput = {
  type: string
  severity?: "info" | "warn" | "critical"
  userId?: string | null
  email?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Prisma.InputJsonValue
}

const SUSPICIOUS_EVENT_WINDOW_MINUTES = 15
const SUSPICIOUS_EVENT_THRESHOLD = 5

function isMissingTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
}

export async function recordAuthEvent(input: AuthEventInput) {
  try {
    await prisma.authSecurityEvent.create({
      data: {
        type: input.type,
        severity: input.severity ?? "info",
        userId: input.userId ?? null,
        email: input.email ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata,
      },
    })
  } catch (error) {
    if (isMissingTableError(error)) return
    throw error
  }
}

export async function invalidateUserSessions(userId: string, reason: string) {
  const now = new Date()

  try {
    await prisma.$transaction([
      prisma.session.deleteMany({
        where: { userId },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          sessionVersion: { increment: 1 },
          updatedAt: now,
        },
      }),
    ])
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error
    }
  }

  await recordAuthEvent({
    type: "sessions_invalidated",
    severity: "critical",
    userId,
    metadata: { reason },
  })
}

export async function registerAuthFailureAndInvalidateIfNeeded(input: {
  userId?: string | null
  email?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  reason: string
}) {
  await recordAuthEvent({
    type: "auth_failure",
    severity: "warn",
    userId: input.userId,
    email: input.email,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { reason: input.reason },
  })

  if (!input.userId) return

  const thresholdWindow = new Date(Date.now() - SUSPICIOUS_EVENT_WINDOW_MINUTES * 60 * 1000)

  try {
    const recentFailures = await prisma.authSecurityEvent.count({
      where: {
        userId: input.userId,
        severity: "warn",
        type: "auth_failure",
        createdAt: {
          gte: thresholdWindow,
        },
      },
    })

    if (recentFailures >= SUSPICIOUS_EVENT_THRESHOLD) {
      await invalidateUserSessions(input.userId, "suspicious-auth-failures")
    }
  } catch (error) {
    if (isMissingTableError(error)) return
    throw error
  }
}
