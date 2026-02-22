"use client"

import { type ComponentType, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Brain, CalendarClock, Clock, Layers3, LineChart,
  Pencil, Play, Plus, PlugZap, Sparkles, Trash2, Workflow, X,
} from "lucide-react"

import {
  type Campaign, type CampaignSchedule, type CampaignStatus, type ScheduleType, type RecurrenceInterval,
  seedCampaigns, seedSendTimeSignals, seedContentSignals, pluginIntegrations,
} from "@/app/campaigns/campaigns-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type SessionUserSummary } from "@/types/session-user"
import { templateOptions } from "@/components/shared/newsletter/template-data"
import { cn } from "@/lib/utils"

type CampaignSectionId = "overview" | "create" | "schedule" | "intelligence" | "performance" | "plugins" | "automation"

const campaignSections: Array<{
  id: CampaignSectionId
  label: string
  icon: ComponentType<{ className?: string }>
  description: string
}> = [
  { id: "overview", label: "Overview", icon: Layers3, description: "Campaign pulse and execution status." },
  { id: "create", label: "Create", icon: Plus, description: "New campaign with AI-assisted drafting." },
  { id: "schedule", label: "Schedule", icon: CalendarClock, description: "Planned launches and queue windows." },
  { id: "intelligence", label: "Intelligence", icon: Brain, description: "AI signals, optimal timing, and strategy." },
  { id: "performance", label: "Performance", icon: LineChart, description: "KPI tracking and cohort insights." },
  { id: "plugins", label: "Plugins", icon: PlugZap, description: "Integrations and orchestration endpoints." },
  { id: "automation", label: "Automation", icon: Workflow, description: "Flows, triggers, and guardrails." },
]

function statusTone(status: CampaignStatus) {
  if (status === "live") return "bg-emerald-400/20 text-emerald-200"
  if (status === "scheduled") return "bg-sky-400/20 text-sky-200"
  if (status === "completed") return "bg-zinc-600/30 text-zinc-300"
  if (status === "paused") return "bg-amber-400/20 text-amber-200"
  return "bg-zinc-700/60 text-zinc-200"
}

function formatSchedule(schedule: CampaignSchedule): string {
  if (schedule.type === "immediate") return "Send immediately"
  if (schedule.type === "one_time" && schedule.scheduledAt) {
    return `One-time: ${new Date(schedule.scheduledAt).toLocaleString()}`
  }
  if (schedule.type === "recurring" && schedule.recurrence) {
    const next = schedule.scheduledAt ? ` — next: ${new Date(schedule.scheduledAt).toLocaleDateString()}` : ""
    return `Recurring ${schedule.recurrence}${next}`
  }
  return "Not scheduled"
}

function impactColor(impact: "high" | "medium" | "low") {
  if (impact === "high") return "text-rose-300 bg-rose-400/15"
  if (impact === "medium") return "text-amber-300 bg-amber-400/15"
  return "text-zinc-300 bg-zinc-700/40"
}

function generateId() {
  return `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function createBlankCampaign(): Campaign {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name: "",
    subject: "",
    status: "draft",
    audience: "",
    audienceCount: 0,
    schedule: { type: "immediate" },
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Campaign Editor Modal
// ---------------------------------------------------------------------------

function CampaignEditorModal({
  campaign,
  onSave,
  onClose,
}: {
  campaign: Campaign
  onSave: (campaign: Campaign) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Campaign>({ ...campaign })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  const patch = (updates: Partial<Campaign>) => setDraft((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }))
  const patchSchedule = (updates: Partial<CampaignSchedule>) => setDraft((prev) => ({ ...prev, schedule: { ...prev.schedule, ...updates }, updatedAt: new Date().toISOString() }))

  const generateAiSuggestions = async (type: "subject" | "content" | "cta") => {
    setAiLoading(true)
    setAiSuggestions([])
    await new Promise((r) => setTimeout(r, 800))
    const suggestions: Record<string, string[]> = {
      subject: [
        `🔥 ${draft.name || "Your campaign"} — don't miss this`,
        `Exclusive for ${draft.audience || "you"}: something special inside`,
        `[Action required] ${draft.name || "Important update"} this week`,
      ],
      content: [
        "Open with a bold stat or question to hook attention in the first line.",
        "Keep the body to 3 short paragraphs max. Use bullet points for scanability.",
        "End with a single, clear call-to-action button — avoid multiple competing CTAs.",
      ],
      cta: [
        "Shop Now →",
        "Claim Your Spot",
        "See What's New",
        "Get Started Free",
      ],
    }
    setAiSuggestions(suggestions[type] ?? [])
    setAiLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-12 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 p-5 shadow-2xl ring-1 ring-zinc-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">{campaign.name ? "Edit Campaign" : "Create Campaign"}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Campaign name</label>
            <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Spring Sale Newsletter" className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-sky-500/50" />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-zinc-400">Subject line</label>
              <button type="button" onClick={() => generateAiSuggestions("subject")} className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300 hover:bg-violet-500/25">
                <Sparkles className="h-3 w-3" /> AI suggest
              </button>
            </div>
            <input value={draft.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="Email subject line..." className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-sky-500/50" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Audience</label>
            <input value={draft.audience} onChange={(e) => patch({ audience: e.target.value })} placeholder="e.g. Newsletter subscribers" className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-sky-500/50" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Template</label>
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => patch({ templateId: undefined })}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition",
                  !draft.templateId ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800",
                )}
              >
                No template
              </button>
              {templateOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ templateId: t.id })}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2 text-left transition",
                    draft.templateId === t.id ? "bg-sky-500/20 ring-1 ring-sky-500/40" : "bg-zinc-900 hover:bg-zinc-800",
                  )}
                >
                  <p className={cn("text-xs font-medium", draft.templateId === t.id ? "text-sky-200" : "text-zinc-200")}>{t.name}</p>
                  <p className="text-[10px] text-zinc-500">{t.domain} · {t.tone}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-zinc-400">Content notes</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => generateAiSuggestions("content")} className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300 hover:bg-violet-500/25">
                  <Sparkles className="h-3 w-3" /> AI content tips
                </button>
                <button type="button" onClick={() => generateAiSuggestions("cta")} className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/25">
                  <Sparkles className="h-3 w-3" /> AI CTAs
                </button>
              </div>
            </div>
            <textarea value={draft.content ?? ""} onChange={(e) => patch({ content: e.target.value })} rows={3} placeholder="Campaign body content or notes..." className="w-full rounded-xl bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-sky-500/50" />
          </div>

          {aiSuggestions.length > 0 && (
            <div className="rounded-xl bg-violet-500/10 p-3">
              <p className="mb-2 text-xs font-medium text-violet-300">AI Suggestions</p>
              <div className="space-y-1.5">
                {aiSuggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => { if (s.includes("→") || s.includes("Claim") || s.includes("Get Started") || s.includes("See What")) { patch({ content: (draft.content ?? "") + `\n\nCTA: ${s}` }) } else { patch({ subject: s }) } setAiSuggestions([]) }} className="block w-full rounded-lg bg-zinc-900/50 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {aiLoading && <p className="text-xs text-violet-300 animate-pulse">Generating suggestions...</p>}

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Schedule</label>
            <div className="flex gap-2">
              {(["immediate", "one_time", "recurring"] as ScheduleType[]).map((type) => (
                <button key={type} type="button" onClick={() => patchSchedule({ type })} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition", draft.schedule.type === type ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800")}>
                  {type === "immediate" ? "Immediate" : type === "one_time" ? "One-time" : "Recurring"}
                </button>
              ))}
            </div>
          </div>

          {draft.schedule.type !== "immediate" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Send date & time</label>
                <input type="datetime-local" value={draft.schedule.scheduledAt?.slice(0, 16) ?? ""} onChange={(e) => patchSchedule({ scheduledAt: new Date(e.target.value).toISOString() })} className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-sky-500/50" />
              </div>
              {draft.schedule.type === "recurring" && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Repeat every</label>
                  <select value={draft.schedule.recurrence ?? "weekly"} onChange={(e) => patchSchedule({ recurrence: e.target.value as RecurrenceInterval })} className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-sky-500/50">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            {draft.templateId && (
              <Button
                type="button"
                onClick={() => { onSave(draft); onClose(); window.location.href = `/chat?template=${draft.templateId}` }}
                className="rounded-xl bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Continue in chat
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={onClose} className="rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700">Cancel</Button>
            <Button type="button" onClick={() => { onSave(draft); onClose() }} disabled={!draft.name.trim()} className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500">
              {campaign.name ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function CampaignsPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<CampaignSectionId>("overview")
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const isProUser = initialUser.plan === "pro" || initialUser.plan === "premium" || initialUser.plan === "enterprise"
  const activeSectionMeta = useMemo(() => campaignSections.find((s) => s.id === activeSection) ?? campaignSections[0], [activeSection])

  const scheduledCount = campaigns.filter((c) => c.status === "scheduled").length
  const liveCount = campaigns.filter((c) => c.status === "live").length
  const draftCount = campaigns.filter((c) => c.status === "draft").length

  const saveCampaign = (updated: Campaign) => {
    setCampaigns((prev) => {
      const exists = prev.find((c) => c.id === updated.id)
      if (exists) return prev.map((c) => (c.id === updated.id ? updated : c))
      return [updated, ...prev]
    })
  }

  const deleteCampaign = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <WorkspaceShell tab="campaigns" pageTitle="Campaigns" user={initialUser}>
      <div data-workspace-scroll className="scrollbar-hide h-full min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Campaigns workspace</h2>
            <p className="text-sm text-zinc-400">Create, schedule, and optimize email campaigns with AI-powered intelligence.</p>
          </div>
          <div className="flex items-center gap-2">
            {isProUser && (
              <Button type="button" onClick={() => { setEditingCampaign(createBlankCampaign()); setActiveSection("create") }} className="rounded-xl bg-sky-500/20 text-sky-200 hover:bg-sky-500/30">
                <Plus className="mr-1.5 h-4 w-4" /> New campaign
              </Button>
            )}
            <Badge className={cn("rounded-full", isProUser ? "bg-emerald-400/20 text-emerald-200" : "bg-violet-400/20 text-violet-200")}>
              {isProUser ? "Pro" : "Pro feature"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-zinc-950/70 p-2.5">
            <div className="space-y-1">
              {campaignSections.map((section) => {
                const Icon = section.icon
                const active = activeSection === section.id
                return (
                  <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={cn("w-full rounded-xl px-3 py-2.5 text-left transition", active ? "bg-sky-500/20 text-sky-100" : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200")}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{section.description}</p>
                  </button>
                )
              })}
            </div>
          </aside>

          {!isProUser ? (
            <section className="relative overflow-hidden rounded-3xl bg-zinc-950/75 p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.2),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(192,132,252,0.28),transparent_42%)]" />
              <div className="absolute inset-0 backdrop-blur-[1px]" />
              <div className="relative z-10">
                <h3 className="text-2xl font-semibold text-zinc-100">Unlock Campaigns</h3>
                <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                  Create AI-assisted email campaigns, schedule one-time or recurring sends, and get intelligent recommendations on timing and content strategy. Upgrade to Pro to access the full campaigns workspace.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Card className="border-0 bg-zinc-900/55 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <Sparkles className="h-5 w-5 text-violet-300" />
                      <p className="mt-2 text-sm font-medium text-zinc-100">AI-assisted drafting</p>
                      <p className="mt-1 text-xs text-zinc-400">Generate subject lines, content, and CTAs with AI.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-zinc-900/55 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <CalendarClock className="h-5 w-5 text-sky-300" />
                      <p className="mt-2 text-sm font-medium text-zinc-100">Smart scheduling</p>
                      <p className="mt-1 text-xs text-zinc-400">One-time or recurring with timezone awareness.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-zinc-900/55 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <Brain className="h-5 w-5 text-emerald-300" />
                      <p className="mt-2 text-sm font-medium text-zinc-100">Signal intelligence</p>
                      <p className="mt-1 text-xs text-zinc-400">Optimal send time and content strategy from your data.</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-6">
                  <Button className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => router.push("/pricing")}>Upgrade to Pro</Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-4">

              {/* ---- OVERVIEW ---- */}
              {activeSection === "overview" && (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Layers3 className="h-5 w-5 text-zinc-300" />
                        <div><p className="text-xs text-zinc-400">Total campaigns</p><p className="text-lg font-semibold text-zinc-100">{campaigns.length}</p></div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Play className="h-5 w-5 text-emerald-300" />
                        <div><p className="text-xs text-zinc-400">Live now</p><p className="text-lg font-semibold text-zinc-100">{liveCount}</p></div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                      <CardContent className="flex items-center gap-3 p-4">
                        <CalendarClock className="h-5 w-5 text-sky-300" />
                        <div><p className="text-xs text-zinc-400">Scheduled</p><p className="text-lg font-semibold text-zinc-100">{scheduledCount}</p></div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Pencil className="h-5 w-5 text-amber-300" />
                        <div><p className="text-xs text-zinc-400">Drafts</p><p className="text-lg font-semibold text-zinc-100">{draftCount}</p></div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-zinc-100">All campaigns</CardTitle>
                      <Button type="button" size="sm" onClick={() => setEditingCampaign(createBlankCampaign())} className="rounded-xl bg-sky-500/20 text-sky-200 hover:bg-sky-500/30">
                        <Plus className="mr-1 h-3.5 w-3.5" /> New
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-zinc-800">
                            <TableHead className="text-zinc-300">Campaign</TableHead>
                            <TableHead className="text-zinc-300">Status</TableHead>
                            <TableHead className="text-zinc-300">Audience</TableHead>
                            <TableHead className="text-zinc-300">Schedule</TableHead>
                            <TableHead className="text-zinc-300">Open</TableHead>
                            <TableHead className="text-zinc-300">Click</TableHead>
                            <TableHead className="text-zinc-300 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaigns.map((c) => (
                            <TableRow key={c.id} className="border-zinc-900 hover:bg-zinc-900/60">
                              <TableCell>
                                <div>
                                  <p className="text-sm text-zinc-200">{c.name}</p>
                                  <p className="text-xs text-zinc-500">{c.subject}</p>
                                  {c.templateId && (
                                    <p className="mt-0.5 text-[10px] text-violet-400/80">
                                      {templateOptions.find((t) => t.id === c.templateId)?.name ?? "Custom template"}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs", statusTone(c.status))}>{c.status}</span></TableCell>
                              <TableCell className="text-zinc-300">{c.audience} ({c.audienceCount.toLocaleString()})</TableCell>
                              <TableCell className="text-xs text-zinc-400">{formatSchedule(c.schedule)}</TableCell>
                              <TableCell className="text-zinc-300">{c.openRate ?? "-"}</TableCell>
                              <TableCell className="text-zinc-300">{c.clickRate ?? "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <button type="button" onClick={() => setEditingCampaign(c)} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button type="button" onClick={() => deleteCampaign(c.id)} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ---- CREATE (opens editor) ---- */}
              {activeSection === "create" && (
                <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Sparkles className="mb-4 h-10 w-10 text-violet-300" />
                    <h3 className="text-lg font-semibold text-zinc-100">Create a new campaign</h3>
                    <p className="mt-2 max-w-md text-sm text-zinc-400">Use AI to help draft subject lines, content, and CTAs. Set up one-time or recurring schedules.</p>
                    <Button type="button" onClick={() => setEditingCampaign(createBlankCampaign())} className="mt-5 rounded-xl bg-violet-500/20 text-violet-200 hover:bg-violet-500/30">
                      <Plus className="mr-1.5 h-4 w-4" /> Start new campaign
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ---- SCHEDULE ---- */}
              {activeSection === "schedule" && (
                <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                  <CardHeader><CardTitle className="text-zinc-100">Schedule board</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {campaigns.filter((c) => c.status === "scheduled" || c.schedule.type !== "immediate").map((c) => (
                      <div key={c.id} className="rounded-xl bg-zinc-900/65 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-zinc-100">{c.name}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px]", statusTone(c.status))}>{c.status}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                          <Clock className="h-3.5 w-3.5" />
                          {formatSchedule(c.schedule)}
                        </div>
                        {c.schedule.type === "recurring" && (
                          <p className="mt-1 text-[11px] text-zinc-500">Repeats {c.schedule.recurrence}{c.schedule.timezone ? ` (${c.schedule.timezone})` : ""}</p>
                        )}
                        <button type="button" onClick={() => setEditingCampaign(c)} className="mt-2 text-xs text-sky-300 hover:text-sky-200">Edit schedule →</button>
                      </div>
                    ))}
                    {campaigns.filter((c) => c.status === "scheduled" || c.schedule.type !== "immediate").length === 0 && (
                      <p className="text-sm text-zinc-500">No scheduled campaigns yet. Create one to get started.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ---- INTELLIGENCE ---- */}
              {activeSection === "intelligence" && (
                <>
                  <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-zinc-100"><Brain className="h-5 w-5 text-emerald-300" /> Optimal send times</CardTitle></CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                      {seedSendTimeSignals.map((signal, i) => (
                        <div key={i} className="rounded-xl bg-zinc-900/65 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-zinc-100">{signal.dayOfWeek} at {signal.hour}:00</p>
                            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">{signal.score}%</span>
                          </div>
                          <p className="mt-1.5 text-xs text-zinc-400">{signal.reason}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-zinc-100"><Sparkles className="h-5 w-5 text-violet-300" /> Content strategy recommendations</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {seedContentSignals.map((signal) => (
                        <div key={signal.id} className="flex items-start gap-3 rounded-xl bg-zinc-900/65 p-3">
                          <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", impactColor(signal.impact))}>{signal.impact}</span>
                          <div>
                            <p className="text-sm text-zinc-100">{signal.recommendation}</p>
                            <p className="mt-1 text-xs text-zinc-500">Based on: {signal.basedOn}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ---- PERFORMANCE ---- */}
              {activeSection === "performance" && (
                <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                  <CardHeader><CardTitle className="text-zinc-100">Performance insights</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-zinc-900/65 p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Deliverability</p>
                      <p className="mt-2 text-lg font-semibold text-zinc-100">98.7%</p>
                    </div>
                    <div className="rounded-xl bg-zinc-900/65 p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Avg open rate</p>
                      <p className="mt-2 text-lg font-semibold text-zinc-100">47.9%</p>
                    </div>
                    <div className="rounded-xl bg-zinc-900/65 p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Avg click rate</p>
                      <p className="mt-2 text-lg font-semibold text-zinc-100">12.1%</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ---- PLUGINS ---- */}
              {activeSection === "plugins" && (
                <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                  <CardHeader><CardTitle className="text-zinc-100">Plugin integrations</CardTitle></CardHeader>
                  <CardContent className="grid gap-2 md:grid-cols-2">
                    {pluginIntegrations.map((plugin) => (
                      <div key={plugin.id} className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{plugin.name}</p>
                          <p className="text-xs text-zinc-400">{plugin.category}</p>
                        </div>
                        <Badge className={plugin.status === "connected" ? "rounded-full bg-emerald-400/20 text-emerald-200" : "rounded-full bg-zinc-700 text-zinc-200"}>
                          {plugin.status === "connected" ? "Connected" : "Not connected"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* ---- AUTOMATION ---- */}
              {activeSection === "automation" && (
                <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
                  <CardHeader><CardTitle className="text-zinc-100">Automation flows</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="rounded-xl bg-zinc-900/65 p-3">
                      <p className="text-sm font-medium text-zinc-100">Behavior-based sequence</p>
                      <p className="mt-1 text-xs text-zinc-400">Trigger follow-up paths based on opens, clicks, and delivery events.</p>
                    </div>
                    <div className="rounded-xl bg-zinc-900/65 p-3">
                      <p className="text-sm font-medium text-zinc-100">Queue-safe launch orchestration</p>
                      <p className="mt-1 text-xs text-zinc-400">Automatic pacing and retry limits per provider to protect deliverability.</p>
                    </div>
                    <div className="rounded-xl bg-zinc-900/65 p-3">
                      <p className="text-sm font-medium text-zinc-100">Non-opener re-engagement</p>
                      <p className="mt-1 text-xs text-zinc-400">Automatically resend to non-openers after 48 hours with a different subject line.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          )}
        </div>
      </div>

      {editingCampaign && (
        <CampaignEditorModal
          campaign={editingCampaign}
          onSave={saveCampaign}
          onClose={() => setEditingCampaign(null)}
        />
      )}
    </WorkspaceShell>
  )
}
