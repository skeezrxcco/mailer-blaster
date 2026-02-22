// ---------------------------------------------------------------------------
// Campaign core types
// ---------------------------------------------------------------------------

export type CampaignStatus = "draft" | "scheduled" | "live" | "completed" | "paused"

export type ScheduleType = "immediate" | "one_time" | "recurring"

export type RecurrenceInterval = "daily" | "weekly" | "biweekly" | "monthly"

export type CampaignSchedule = {
  type: ScheduleType
  scheduledAt?: string
  recurrence?: RecurrenceInterval
  timezone?: string
}

export type Campaign = {
  id: string
  name: string
  subject: string
  status: CampaignStatus
  audience: string
  audienceCount: number
  templateId?: string
  schedule: CampaignSchedule
  content?: string
  openRate?: string
  clickRate?: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// AI suggestion types
// ---------------------------------------------------------------------------

export type AiSuggestionType = "subject_line" | "content" | "cta" | "send_time" | "strategy"

export type AiSuggestion = {
  id: string
  type: AiSuggestionType
  text: string
  confidence: number
  reasoning?: string
}

// ---------------------------------------------------------------------------
// Signal-based intelligence types
// ---------------------------------------------------------------------------

export type SendTimeSignal = {
  dayOfWeek: string
  hour: number
  score: number
  reason: string
}

export type ContentSignal = {
  id: string
  recommendation: string
  impact: "high" | "medium" | "low"
  basedOn: string
}

// ---------------------------------------------------------------------------
// Plugin types (kept from original)
// ---------------------------------------------------------------------------

export type PluginIntegration = {
  id: string
  name: string
  category: string
  status: "connected" | "not_connected"
}

// ---------------------------------------------------------------------------
// Seed / demo data
// ---------------------------------------------------------------------------

export const seedCampaigns: Campaign[] = [
  {
    id: "cmp-001",
    name: "VIP Omakase Week",
    subject: "You're invited: exclusive omakase experience",
    status: "live",
    audience: "VIP diners",
    audienceCount: 2840,
    schedule: { type: "immediate" },
    openRate: "51.3%",
    clickRate: "16.4%",
    createdAt: "2026-02-18T10:00:00Z",
    updatedAt: "2026-02-20T14:22:00Z",
  },
  {
    id: "cmp-002",
    name: "Lunch Burger Combo",
    subject: "New combo deal — this week only",
    status: "scheduled",
    audience: "Lunch regulars",
    audienceCount: 1920,
    schedule: { type: "one_time", scheduledAt: "2026-02-21T11:45:00Z", timezone: "America/New_York" },
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-02-19T16:00:00Z",
  },
  {
    id: "cmp-003",
    name: "Weekly Vegan Bowl Update",
    subject: "This week's fresh vegan bowls 🥗",
    status: "scheduled",
    audience: "Health-conscious subscribers",
    audienceCount: 1230,
    schedule: { type: "recurring", recurrence: "weekly", scheduledAt: "2026-02-24T09:00:00Z", timezone: "Europe/London" },
    createdAt: "2026-02-10T12:00:00Z",
    updatedAt: "2026-02-20T08:30:00Z",
  },
  {
    id: "cmp-004",
    name: "Valentine's Day Afterglow",
    subject: "Missed Valentine's? We've got you covered",
    status: "draft",
    audience: "All subscribers",
    audienceCount: 4100,
    schedule: { type: "immediate" },
    createdAt: "2026-02-16T11:00:00Z",
    updatedAt: "2026-02-16T11:00:00Z",
  },
]

export const seedSendTimeSignals: SendTimeSignal[] = [
  { dayOfWeek: "Tuesday", hour: 10, score: 92, reason: "Highest open rate from past 30-day cohort" },
  { dayOfWeek: "Thursday", hour: 14, score: 87, reason: "Strong click-through in afternoon slot" },
  { dayOfWeek: "Wednesday", hour: 9, score: 81, reason: "Consistent engagement for newsletter-type sends" },
]

export const seedContentSignals: ContentSignal[] = [
  { id: "sig-1", recommendation: "Use personalized subject lines — adds ~12% open rate lift", impact: "high", basedOn: "A/B test results from last 5 campaigns" },
  { id: "sig-2", recommendation: "Include a single clear CTA — multi-CTA emails underperform by 18%", impact: "high", basedOn: "Click-through analysis across 1,200 sends" },
  { id: "sig-3", recommendation: "Keep preview text under 90 characters for mobile optimization", impact: "medium", basedOn: "Device analytics: 68% of opens are mobile" },
  { id: "sig-4", recommendation: "Send follow-up to non-openers after 48 hours", impact: "medium", basedOn: "Re-engagement conversion data" },
]

export const pluginIntegrations: PluginIntegration[] = [
  { id: "plg-1", name: "Shopify", category: "E-commerce", status: "connected" },
  { id: "plg-2", name: "Stripe", category: "Payments", status: "connected" },
  { id: "plg-3", name: "Zapier", category: "Automation", status: "not_connected" },
  { id: "plg-4", name: "HubSpot", category: "CRM", status: "not_connected" },
]
