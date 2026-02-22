import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? "7"), 1), 30)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await prisma.aiRequestTelemetry.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      provider: true,
      model: true,
      status: true,
      latencyMs: true,
      estimatedCostUsd: true,
      moderationAction: true,
      createdAt: true,
    },
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.requests += 1
      if (row.status === "SUCCESS") acc.success += 1
      if (row.status !== "SUCCESS") acc.failed += 1
      if (row.latencyMs) acc.latencyTotal += row.latencyMs
      if (row.estimatedCostUsd) acc.costTotal += row.estimatedCostUsd
      return acc
    },
    { requests: 0, success: 0, failed: 0, latencyTotal: 0, costTotal: 0 },
  )

  return NextResponse.json({
    days,
    totals: {
      ...totals,
      avgLatencyMs: totals.requests ? Math.round(totals.latencyTotal / totals.requests) : 0,
      estimatedCostUsd: Number(totals.costTotal.toFixed(6)),
    },
    byProvider: rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.provider] = (acc[row.provider] ?? 0) + 1
      return acc
    }, {}),
    items: rows,
  })
}

