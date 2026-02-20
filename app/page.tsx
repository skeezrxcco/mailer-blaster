import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { WaitlistLanding } from "@/components/shared/waitlist/waitlist-landing"

function isWaitlistModeEnabled() {
  const fallback = process.env.NODE_ENV === "production" ? "true" : "false"
  const raw = (process.env.WAITLIST_MODE ?? fallback).trim().toLowerCase()
  return raw === "true" || raw === "1" || raw === "yes"
}

export default async function Home() {
  if (isWaitlistModeEnabled()) {
    return <WaitlistLanding />
  }

  const session = await getServerSession(authOptions)
  redirect(session ? "/chat" : "/login")
}
