"use client"

import { useEffect, useState } from "react"

export type AiQuota = {
  /** 0–100, percentage of monthly quota remaining */
  quotaPercent: number
  /** True when quota is fully consumed */
  exhausted: boolean
  /** Current plan: "free" | "pro" | "premium" */
  plan: string
  /** ISO date when quota resets */
  resetAt: string | null
}

const defaultQuota: AiQuota = {
  quotaPercent: 100,
  exhausted: false,
  plan: "free",
  resetAt: null,
}

export function useAiCredits(): AiQuota {
  const [quota, setQuota] = useState<AiQuota>(defaultQuota)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch("/api/ai/credits", {
          method: "GET",
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as AiQuota
        if (!cancelled) setQuota(payload)
      } catch {
        // Keep fallback.
      }
    }

    void load()
    const interval = window.setInterval(load, 45_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return quota
}

