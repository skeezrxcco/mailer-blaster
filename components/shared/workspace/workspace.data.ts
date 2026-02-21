import type { SidebarTab } from "@/hooks/use-workspace-tab"

export type SettingsSection = "profile" | "plan" | "usage" | "referals"

export type WorkspaceIconKey =
  | "bot"
  | "fileText"
  | "users"
  | "rocket"
  | "sparkles"
  | "circleCheck"
  | "partyPopper"
  | "handCoins"
  | "idCard"

export type WorkspaceNavSeed<TId extends string> = {
  id: TId
  label: string
  icon: WorkspaceIconKey
}

export const sidebarItems: WorkspaceNavSeed<SidebarTab>[] = [
  { id: "chat", label: "Chat", icon: "bot" },
  { id: "templates", label: "Templates", icon: "fileText" },
  { id: "contacts", label: "Contacts", icon: "users" },
  { id: "activity", label: "Activity", icon: "rocket" },
  { id: "campaigns", label: "Campaigns", icon: "sparkles" },
]

export const settingsSidebarItems: WorkspaceNavSeed<SettingsSection | "pricing" | "checkout">[] = [
  { id: "profile", label: "Profile", icon: "users" },
  { id: "plan", label: "Plan", icon: "circleCheck" },
  { id: "usage", label: "Usage", icon: "rocket" },
  { id: "referals", label: "Referals", icon: "partyPopper" },
  { id: "pricing", label: "Pricing", icon: "handCoins" },
  { id: "checkout", label: "Checkout", icon: "idCard" },
]

export const pageTitleMap: Record<SidebarTab, string> = {
  chat: "Chat",
  templates: "Templates",
  contacts: "Contacts",
  activity: "Activity",
  campaigns: "Campaigns",
  settings: "Settings",
  pricing: "Pricing",
  checkout: "Checkout",
}

export const workspaceStaticData = {
  credits: 120,
  maxCredits: 120,
  expandedTitle: "blastermailer AI",
  settingsTitle: "Settings",
  drawerNavigationTitle: "Navigation",
  settingsDrawerDescription: "Manage account, plan, and billing.",
  workspaceDrawerDescription: "Move through workspace pages.",
  user: {
    name: "Account",
    email: "",
    plan: "starter",
    initials: "A",
    avatarUrl: "",
  },
}

export function settingsSectionFromParam(value: string | null): SettingsSection {
  if (value === "profile" || value === "plan" || value === "usage" || value === "referals") return value
  return "profile"
}
