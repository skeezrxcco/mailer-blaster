export type CampaignRecord = {
  id: string
  campaignName: string
  templateName: string
  audienceCount: number
  sentAt: string
  openRate: string
  clickRate: string
  status: "sent" | "scheduled" | "draft" | "queued" | "processing"
}

export const campaignHistory: CampaignRecord[] = [
  {
    id: "cmp-101",
    campaignName: "Weekend Omakase Launch",
    templateName: "Sushi Omakase Signature",
    audienceCount: 1248,
    sentAt: "2026-02-17 18:30",
    openRate: "49.3%",
    clickRate: "14.2%",
    status: "sent",
  },
  {
    id: "cmp-100",
    campaignName: "Plant-Based Lunch Drop",
    templateName: "Vegan Garden Journal",
    audienceCount: 892,
    sentAt: "2026-02-15 12:10",
    openRate: "46.1%",
    clickRate: "11.8%",
    status: "sent",
  },
]
