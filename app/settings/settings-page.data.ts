import type { CheckoutItem } from "@/hooks/use-checkout-item"

export type SettingsSection = "profile" | "plan" | "usage" | "referals"

export function settingsSectionFromParam(value: string | null): SettingsSection {
  if (value === "profile" || value === "plan" || value === "usage" || value === "referals") return value
  return "profile"
}

export const usageTimeline = [
  { label: "Mon", sends: 640, opens: 322 },
  { label: "Tue", sends: 720, opens: 381 },
  { label: "Wed", sends: 810, opens: 436 },
  { label: "Thu", sends: 780, opens: 401 },
  { label: "Fri", sends: 912, opens: 468 },
  { label: "Sat", sends: 688, opens: 334 },
  { label: "Sun", sends: 560, opens: 288 },
]

export const usageByChannel = [
  { channel: "Campaigns", value: 58 },
  { channel: "Automations", value: 26 },
  { channel: "Referrals", value: 16 },
]

export const usageLimitData = [{ label: "Cycle usage", used: 8412, limit: 20000 }]

export const usageChartConfig = {
  sends: { label: "Sends", color: "#60a5fa" },
  opens: { label: "Opens", color: "#34d399" },
  value: { label: "Share", color: "#f59e0b" },
}

export const usageLimitChartConfig = {
  used: { label: "Used", color: "#60a5fa" },
  limit: { label: "Limit", color: "#f59e0b" },
}

export const profileData = {
  name: "Ricardo Pires",
  email: "ricardo@example.com",
  timezone: "Europe/Lisbon",
  senderName: "blastermailer AI",
  replyTo: "hello@blastermailer.ai",
  locale: "en-US",
  style: "professional",
}

export const currentPlanFacts = [
  "Contacts included: 20,000",
  "AI templates: unlimited",
  "Team seats: 3",
  "Billing cycle: monthly",
]

export const referralsData = {
  link: "https://blastermailer.ai/r/ref-rp-2026",
  rewardText: "Current reward: 50 credits per converted referral.",
  quarterStatsText: "Referrals this quarter: 4 successful",
}

export const checkoutPresets: {
  growthPlan: CheckoutItem
  extraEmails10k: CheckoutItem
  extraEmails50k: CheckoutItem
} = {
  growthPlan: {
    id: "plan-growth",
    kind: "plan",
    name: "Growth plan",
    description: "Monthly subscription for restaurant teams",
    price: 79,
    billing: "monthly",
  },
  extraEmails10k: {
    id: "emails-10k",
    kind: "emails",
    name: "10,000 extra emails",
    description: "One-time send boost for this cycle",
    price: 39,
    billing: "one-time",
  },
  extraEmails50k: {
    id: "emails-50k",
    kind: "emails",
    name: "50,000 extra emails",
    description: "One-time send boost for peak campaigns",
    price: 149,
    billing: "one-time",
  },
}
