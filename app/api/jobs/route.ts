import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { JobStatus } from "@prisma/client"

import { authOptions } from "@/lib/auth"
import { createJob, listJobs } from "@/lib/jobs"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusQuery = (searchParams.get("status") ?? "").toUpperCase()
  const status = statusQuery in JobStatus ? (JobStatus[statusQuery as keyof typeof JobStatus] as JobStatus) : undefined
  const limit = Number(searchParams.get("limit") ?? "50")

  const jobs = await listJobs({
    userId: session.user.id,
    status,
    limit,
  })

  return NextResponse.json({ jobs })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    type?: string
    payload?: Record<string, unknown>
    availableAt?: string
  }

  const type = String(body.type ?? "").trim()
  if (!type) {
    return NextResponse.json({ error: "Job type is required" }, { status: 422 })
  }

  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "Job payload must be an object" }, { status: 422 })
  }

  const job = await createJob({
    userId: session.user.id,
    type,
    payload: body.payload,
    availableAt: body.availableAt ? new Date(body.availableAt) : undefined,
  })

  return NextResponse.json({ job }, { status: 201 })
}
