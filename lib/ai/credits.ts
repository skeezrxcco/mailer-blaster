import { prisma } from "@/lib/prisma"
import type { AiModelMode } from "@/lib/ai/model-mode"
import {
  type ModelRegistryEntry,
  getModelForMode,
  getPlanBudget,
  tokenCostToCredits,
  estimateTokensFromText,
  type PlanUsageBudget,
} from "@/lib/ai/model-registry"

type CongestionLevel = "low" | "moderate" | "high" | "severe"

export type AiCreditsSnapshot = {
  limited: boolean
  maxCredits: number | null
  remainingCredits: number | null
  usedCredits: number | null
  windowHours: number | null
  resetAt: Date | null
  congestion: CongestionLevel
  /** Monthly provider-cost budget in USD */
  monthlyBudgetUsd: number
  /** Estimated remaining provider-cost budget in USD */
  remainingBudgetUsd: number
}

const DEFAULT_NON_PRO_MAX_CREDITS = 25

function isPaidPlan(plan: string | undefined) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  return normalized === "pro" || normalized === "premium" || normalized === "enterprise"
}

function parsePositiveInt(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function getNonProMaxCredits() {
  const configured = parsePositiveInt(process.env.AI_NON_PRO_CREDITS_MAX)
  return configured || DEFAULT_NON_PRO_MAX_CREDITS
}

function windowFromCongestion(errorRate: number, avgLatencyMs: number): { hours: number; congestion: CongestionLevel } {
  const latency = Number.isFinite(avgLatencyMs) ? avgLatencyMs : 0
  if (errorRate >= 0.35 || latency >= 4500) return { hours: 12, congestion: "severe" }
  if (errorRate >= 0.25 || latency >= 3000) return { hours: 10, congestion: "high" }
  if (errorRate >= 0.15 || latency >= 1800) return { hours: 8, congestion: "moderate" }
  return { hours: 6, congestion: "low" }
}

async function resolveAdaptiveWindowHours() {
  const lookbackMinutes = parsePositiveInt(process.env.AI_CREDITS_CONGESTION_LOOKBACK_MINUTES) || 20
  const since = new Date(Date.now() - lookbackMinutes * 60 * 1000)

  const [statusRows, latencyAgg] = await Promise.all([
    prisma.aiRequestTelemetry.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.aiRequestTelemetry.aggregate({
      where: {
        createdAt: { gte: since },
        latencyMs: { not: null },
      },
      _avg: {
        latencyMs: true,
      },
    }),
  ])

  const total = statusRows.reduce((sum, row) => sum + row._count._all, 0)
  const failed = statusRows
    .filter((row) => row.status !== "SUCCESS")
    .reduce((sum, row) => sum + row._count._all, 0)

  const errorRate = total > 0 ? failed / total : 0
  const avgLatencyMs = Number(latencyAgg._avg.latencyMs ?? 0)

  return windowFromCongestion(errorRate, avgLatencyMs)
}

function buildWindowInfo(windowHours: number, now = Date.now()) {
  const windowMs = windowHours * 60 * 60 * 1000
  const startedAtMs = now - (now % windowMs)
  const resetAtMs = startedAtMs + windowMs
  const key = `ai-credits:${windowHours}h:${new Date(startedAtMs).toISOString()}`

  return {
    key,
    resetAt: new Date(resetAtMs),
  }
}

function buildMonthKey(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `ai-month:${year}-${month}`
}

function getMonthResetDate(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

async function getMonthlyUsageCredits(userId: string): Promise<number> {
  const monthKey = buildMonthKey()
  const usage = await prisma.aiUserDailyUsage.findUnique({
    where: { day_userId: { day: monthKey, userId } },
    select: { requests: true },
  })
  return usage?.requests ?? 0
}

export function estimateCreditCost(input: {
  prompt: string
  responseText?: string
  mode: AiModelMode
  toolName?: string
}) {
  const promptUnits = Math.max(1, Math.ceil(input.prompt.trim().length / 180))
  const responseUnits = input.responseText ? Math.max(1, Math.ceil(input.responseText.trim().length / 260)) : 1

  const modeWeight = input.mode === "premium" ? 1.8 : input.mode === "balanced" ? 1.35 : 1
  const toolWeight =
    input.toolName === "confirm_queue_campaign" || input.toolName === "request_recipients"
      ? 0.9
      : input.toolName === "review_campaign" || input.toolName === "compose_signature_email"
        ? 1.25
        : 1.1

  const raw = Math.ceil((promptUnits * 0.8 + responseUnits * 1.2) * modeWeight * toolWeight)
  return Math.max(1, Math.min(raw, 8))
}

export async function getAiCreditsSnapshot(input: { userId: string; userPlan?: string }): Promise<AiCreditsSnapshot> {
  const planBudget = getPlanBudget(input.userPlan ?? "free")

  if (isPaidPlan(input.userPlan)) {
    const monthlyUsage = await getMonthlyUsageCredits(input.userId)
    const estimatedSpendUsd = monthlyUsage * 0.0003
    const remainingBudgetUsd = Math.max(0, planBudget.monthlyBudgetUsd - estimatedSpendUsd)
    const exhausted = remainingBudgetUsd <= 0

    return {
      limited: true,
      maxCredits: Math.ceil(planBudget.monthlyBudgetUsd / 0.0003),
      remainingCredits: exhausted ? 0 : Math.ceil(remainingBudgetUsd / 0.0003),
      usedCredits: monthlyUsage,
      windowHours: null,
      resetAt: getMonthResetDate(),
      congestion: "low",
      monthlyBudgetUsd: planBudget.monthlyBudgetUsd,
      remainingBudgetUsd,
    }
  }

  const maxCredits = getNonProMaxCredits()
  const { hours, congestion } = await resolveAdaptiveWindowHours()
  const windowInfo = buildWindowInfo(hours)

  const usage = await prisma.aiUserDailyUsage.findUnique({
    where: {
      day_userId: {
        day: windowInfo.key,
        userId: input.userId,
      },
    },
    select: {
      requests: true,
    },
  })

  const usedCredits = usage?.requests ?? 0
  const remainingCredits = Math.max(0, maxCredits - usedCredits)

  const estimatedSpendUsd = usedCredits * 0.0003
  const remainingBudgetUsd = Math.max(0, planBudget.monthlyBudgetUsd - estimatedSpendUsd)

  return {
    limited: true,
    maxCredits,
    remainingCredits,
    usedCredits,
    windowHours: hours,
    resetAt: windowInfo.resetAt,
    congestion,
    monthlyBudgetUsd: planBudget.monthlyBudgetUsd,
    remainingBudgetUsd,
  }
}

export async function assertMinimumCredits(input: { userId: string; userPlan?: string; minimumCredits: number }) {
  const snapshot = await getAiCreditsSnapshot(input)
  if (!snapshot.limited) return snapshot

  const minimum = Math.max(1, input.minimumCredits)
  const remainingCredits = snapshot.remainingCredits ?? 0
  if (remainingCredits < minimum) {
    const resetInMinutes = snapshot.resetAt
      ? Math.max(1, Math.ceil((snapshot.resetAt.getTime() - Date.now()) / (60 * 1000)))
      : null
    const resetLabel = resetInMinutes ? `${resetInMinutes}m` : "next window"
    throw new Error(
      `AI credits exhausted. You have ${remainingCredits}/${snapshot.maxCredits} credits left. Next refill in ${resetLabel}.`,
    )
  }

  return snapshot
}

export async function consumeAiCredits(input: {
  userId: string
  userPlan?: string
  credits: number
  cachedSnapshot?: AiCreditsSnapshot
}) {
  if (isPaidPlan(input.userPlan)) {
    const snapshot = input.cachedSnapshot ?? (await getAiCreditsSnapshot({ userId: input.userId, userPlan: input.userPlan }))
    if (snapshot.remainingBudgetUsd <= 0) {
      return { charged: 0, snapshot }
    }
    const requested = Math.max(1, input.credits)
    const monthKey = buildMonthKey()
    await prisma.aiUserDailyUsage.upsert({
      where: { day_userId: { day: monthKey, userId: input.userId } },
      create: { day: monthKey, userId: input.userId, requests: requested },
      update: { requests: { increment: requested } },
    })
    const nextSnapshot = await getAiCreditsSnapshot({ userId: input.userId, userPlan: input.userPlan })
    return { charged: requested, snapshot: nextSnapshot }
  }

  const snapshot = input.cachedSnapshot ?? (await getAiCreditsSnapshot({ userId: input.userId, userPlan: input.userPlan }))
  const remaining = snapshot.remainingCredits ?? 0
  if (remaining <= 0) {
    return { charged: 0, snapshot }
  }

  const requested = Math.max(1, input.credits)
  const charged = Math.min(requested, remaining)
  const windowHours = snapshot.windowHours ?? 6
  const windowInfo = buildWindowInfo(windowHours)

  await prisma.aiUserDailyUsage.upsert({
    where: {
      day_userId: {
        day: windowInfo.key,
        userId: input.userId,
      },
    },
    create: {
      day: windowInfo.key,
      userId: input.userId,
      requests: charged,
    },
    update: {
      requests: {
        increment: charged,
      },
    },
  })

  const nextSnapshot = await getAiCreditsSnapshot({ userId: input.userId, userPlan: input.userPlan })
  return {
    charged,
    snapshot: nextSnapshot,
  }
}
