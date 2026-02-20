"use client"

import { useCallback, useEffect, useState } from "react"

const MY_TEMPLATE_IDS_KEY = "workspace_my_template_ids"

function readMyTemplateIdsFromStorage(): string[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(MY_TEMPLATE_IDS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(MY_TEMPLATE_IDS_KEY)
      return []
    }

    const clean = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    if (clean.length !== parsed.length) {
      window.localStorage.setItem(MY_TEMPLATE_IDS_KEY, JSON.stringify(Array.from(new Set(clean))))
    }
    return Array.from(new Set(clean))
  } catch {
    window.localStorage.removeItem(MY_TEMPLATE_IDS_KEY)
    return []
  }
}

function writeMyTemplateIdsToStorage(ids: string[]) {
  if (typeof window === "undefined") return
  const unique = Array.from(new Set(ids.filter((id) => id.trim().length > 0)))
  window.localStorage.setItem(MY_TEMPLATE_IDS_KEY, JSON.stringify(unique))
}

export function getMyTemplateIds(): string[] {
  return readMyTemplateIdsFromStorage()
}

export function addMyTemplateId(id: string): string[] {
  if (!id.trim()) return readMyTemplateIdsFromStorage()
  const next = Array.from(new Set([...readMyTemplateIdsFromStorage(), id]))
  writeMyTemplateIdsToStorage(next)
  return next
}

export function removeMyTemplateId(id: string): string[] {
  const next = readMyTemplateIdsFromStorage().filter((storedId) => storedId !== id)
  writeMyTemplateIdsToStorage(next)
  return next
}

export function isInMyTemplates(id: string): boolean {
  return readMyTemplateIdsFromStorage().includes(id)
}

export function useMyTemplates() {
  const [myTemplateIds, setMyTemplateIds] = useState<string[]>([])

  useEffect(() => {
    setMyTemplateIds(readMyTemplateIdsFromStorage())

    const onStorage = (event: StorageEvent) => {
      if (event.key !== MY_TEMPLATE_IDS_KEY) return
      setMyTemplateIds(readMyTemplateIdsFromStorage())
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setFromResult = useCallback((next: string[]) => {
    setMyTemplateIds(next)
  }, [])

  const addTemplateId = useCallback(
    (id: string) => {
      setFromResult(addMyTemplateId(id))
    },
    [setFromResult],
  )

  const removeTemplateId = useCallback(
    (id: string) => {
      setFromResult(removeMyTemplateId(id))
    },
    [setFromResult],
  )

  const hasTemplateId = useCallback(
    (id: string) => {
      return myTemplateIds.includes(id)
    },
    [myTemplateIds],
  )

  return {
    myTemplateIds,
    addTemplateId,
    removeTemplateId,
    hasTemplateId,
  }
}
