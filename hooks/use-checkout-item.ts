"use client"

import { useCallback, useEffect, useState } from "react"

export type CheckoutItem = {
  id: string
  kind: "plan" | "emails" | "smtp" | "template"
  name: string
  description: string
  price: number
  billing: "monthly" | "annual" | "one-time"
}

const CHECKOUT_ITEM_KEY = "workspace_checkout_item"

function readCheckoutItem(): CheckoutItem | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(CHECKOUT_ITEM_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as CheckoutItem
  } catch {
    return null
  }
}

function writeCheckoutItem(item: CheckoutItem | null) {
  if (typeof window === "undefined") return
  if (!item) {
    window.localStorage.removeItem(CHECKOUT_ITEM_KEY)
    return
  }
  window.localStorage.setItem(CHECKOUT_ITEM_KEY, JSON.stringify(item))
}

export function useCheckoutItem() {
  const [checkoutItem, setCheckoutItemState] = useState<CheckoutItem | null>(null)

  useEffect(() => {
    setCheckoutItemState(readCheckoutItem())

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CHECKOUT_ITEM_KEY) return
      setCheckoutItemState(readCheckoutItem())
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setCheckoutItem = useCallback((item: CheckoutItem | null) => {
    writeCheckoutItem(item)
    setCheckoutItemState(item)
  }, [])

  return {
    checkoutItem,
    hasCheckoutItem: Boolean(checkoutItem),
    setCheckoutItem,
  }
}
