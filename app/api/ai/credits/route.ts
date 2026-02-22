import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getAiCreditsSnapshot } from "@/lib/ai/credits"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const snapshot = await getAiCreditsSnapshot({
    userId: session.user.id,
    userPlan: session.user.plan,
  })

  const quotaPercent =
    snapshot.monthlyBudgetUsd > 0
      ? Math.max(0, Math.min(100, Math.round((snapshot.remainingBudgetUsd / snapshot.monthlyBudgetUsd) * 100)))
      : 0

  return NextResponse.json({
    quotaPercent,
    exhausted: quotaPercent <= 0,
    plan: session.user.plan ?? "free",
    resetAt: snapshot.resetAt?.toISOString() ?? null,
  })
}

