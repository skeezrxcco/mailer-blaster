import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { processPendingJobs } from "@/lib/jobs"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: number }
  const processed = await processPendingJobs(body.limit ?? 5)

  return NextResponse.json({
    processedCount: processed.length,
    processed,
  })
}
