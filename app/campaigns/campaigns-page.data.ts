export type CampaignOpsItem = {
  id: string
  name: string
  status: "live" | "scheduled" | "draft"
  audience: string
  nextRun: string
  openRate: string
  clickRate: string
}

export type PluginIntegration = {
  id: string
  name: string
  category: string
  status: "connected" | "not_connected"
}

export const campaignsOps: CampaignOpsItem[] = [
  {
    id: "ops-01",
    name: "VIP Omakase Week",
    status: "live",
    audience: "2,840 contacts",
    nextRun: "Live now",
    openRate: "51.3%",
    clickRate: "16.4%",
  },
  {
    id: "ops-02",
    name: "Lunch Burger Combo",
    status: "scheduled",
    audience: "1,920 contacts",
    nextRun: "2026-02-21 11:45",
    openRate: "-",
    clickRate: "-",
  },
  {
    id: "ops-03",
    name: "Seasonal Vegan Bowls",
    status: "draft",
    audience: "1,230 contacts",
    nextRun: "Not scheduled",
    openRate: "-",
    clickRate: "-",
  },
]

export const pluginIntegrations: PluginIntegration[] = [
  { id: "plg-1", name: "Shopify", category: "E-commerce", status: "connected" },
  { id: "plg-2", name: "Stripe", category: "Payments", status: "connected" },
  { id: "plg-3", name: "Zapier", category: "Automation", status: "not_connected" },
  { id: "plg-4", name: "HubSpot", category: "CRM", status: "not_connected" },
]
