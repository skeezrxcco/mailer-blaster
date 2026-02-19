import { useMemo } from "react"
import { usePathname } from "next/navigation"

export type SidebarTab = "chat" | "templates" | "contacts" | "activity" | "campaigns" | "settings" | "pricing" | "checkout"

export const tabRoutes: Record<SidebarTab, string> = {
  chat: "/chat",
  templates: "/templates",
  contacts: "/contacts",
  activity: "/activity",
  campaigns: "/campaigns",
  settings: "/settings",
  pricing: "/pricing",
  checkout: "/checkout",
}

export function tabFromPathname(pathname: string): SidebarTab {
  if (pathname.startsWith("/templates")) return "templates"
  if (pathname.startsWith("/contacts")) return "contacts"
  if (pathname.startsWith("/activity")) return "activity"
  if (pathname.startsWith("/campaigns")) return "campaigns"
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname.startsWith("/pricing")) return "pricing"
  if (pathname.startsWith("/checkout")) return "checkout"
  return "chat"
}

export function useWorkspaceTab() {
  const pathname = usePathname()

  return useMemo(() => tabFromPathname(pathname), [pathname])
}
