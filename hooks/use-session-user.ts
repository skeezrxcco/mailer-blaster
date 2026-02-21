"use client"

import { useEffect, useState } from "react"
import { buildSessionUserSummary, type SessionUserSummary } from "@/types/session-user"

type SessionPayload = {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    plan?: string | null
  } | null
}

export function useSessionUser(fallbackUser: SessionUserSummary) {
  const [user, setUser] = useState<SessionUserSummary>(fallbackUser)

  useEffect(() => {
    let cancelled = false

    const syncSessionUser = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        })

        if (!response.ok) return

        const payload = (await response.json()) as SessionPayload
        const sessionUser = payload.user
        if (!sessionUser || cancelled) return

        setUser(buildSessionUserSummary(sessionUser, fallbackUser))
      } catch {
        // Keep fallback user when session cannot be fetched.
      }
    }

    void syncSessionUser()

    return () => {
      cancelled = true
    }
  }, [fallbackUser.avatarUrl, fallbackUser.email, fallbackUser.name, fallbackUser.plan])

  return user
}
