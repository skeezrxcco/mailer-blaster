import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getJobById } from "@/lib/jobs"

export async function GET(_: Request, context: { params: Promise<{ jobId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = await context.params
  const job = await getJobById(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }
  if (job.userId && job.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ job })
}
