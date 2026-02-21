"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { campaignHistory, type CampaignRecord } from "@/app/activity/activity-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type SessionUserSummary } from "@/types/session-user"

function statusTone(status: CampaignRecord["status"]) {
  if (status === "sent") return "bg-emerald-400/20 text-emerald-200"
  if (status === "processing") return "bg-sky-400/20 text-sky-200"
  if (status === "queued") return "bg-amber-400/20 text-amber-200"
  if (status === "scheduled") return "bg-zinc-700/70 text-zinc-200"
  return "bg-zinc-800 text-zinc-300"
}

export function ActivityPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaign")
  const templateName = searchParams.get("template") || "Selected template"
  const audienceCount = Number(searchParams.get("audience") || "0")

  const [queueProgress, setQueueProgress] = useState(campaignId ? 12 : 0)

  useEffect(() => {
    if (!campaignId) return

    setQueueProgress(12)
    const interval = window.setInterval(() => {
      setQueueProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval)
          return 100
        }
        const increment = prev < 70 ? 8 : prev < 92 ? 4 : 2
        return Math.min(100, prev + increment)
      })
    }, 900)

    return () => window.clearInterval(interval)
  }, [campaignId])

  const queueStatus = queueProgress >= 100 ? "sent" : queueProgress >= 45 ? "processing" : "queued"

  const rows = useMemo<CampaignRecord[]>(() => {
    if (!campaignId) return campaignHistory

    const queuedRow: CampaignRecord = {
      id: campaignId,
      campaignName: `Campaign ${campaignId.slice(-6).toUpperCase()}`,
      templateName,
      audienceCount: Number.isFinite(audienceCount) ? audienceCount : 0,
      sentAt: queueStatus === "sent" ? new Date().toISOString().slice(0, 16).replace("T", " ") : "Queue processing",
      openRate: "-",
      clickRate: "-",
      status: queueStatus,
    }

    return [queuedRow, ...campaignHistory]
  }, [audienceCount, campaignId, queueStatus, templateName])

  return (
    <WorkspaceShell tab="activity" pageTitle="Campaign activity" user={initialUser}>
      <div data-workspace-scroll className="scrollbar-hide h-full min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Campaign activity</h2>
          <p className="text-sm text-zinc-400">Track delivery flow and monitor campaign progress in near real-time.</p>
        </div>

        {campaignId ? (
          <Card className="mb-4 rounded-2xl border-zinc-700/80 bg-zinc-950/85">
            <CardHeader>
              <CardTitle className="text-zinc-100">Queue delivery status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <div className="rounded-xl bg-zinc-900/70 px-3 py-2 text-zinc-300">
                  Campaign: <span className="font-medium text-zinc-100">{campaignId}</span>
                </div>
                <div className="rounded-xl bg-zinc-900/70 px-3 py-2 text-zinc-300">
                  Audience: <span className="font-medium text-zinc-100">{audienceCount.toLocaleString()}</span>
                </div>
                <div className="rounded-xl bg-zinc-900/70 px-3 py-2 text-zinc-300">
                  Status: <span className="font-medium capitalize text-zinc-100">{queueStatus}</span>
                </div>
              </div>
              <div>
                <Progress value={queueProgress} className="h-2 bg-zinc-800" />
                <p className="mt-1 text-xs text-zinc-400">{queueProgress}% processed by worker queue.</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">All campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-300">Campaign</TableHead>
                  <TableHead className="text-zinc-300">Template</TableHead>
                  <TableHead className="text-zinc-300">Audience</TableHead>
                  <TableHead className="text-zinc-300">Open</TableHead>
                  <TableHead className="text-zinc-300">Click</TableHead>
                  <TableHead className="text-zinc-300">Status</TableHead>
                  <TableHead className="text-zinc-300">Sent at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((campaign) => (
                  <TableRow key={campaign.id} className="border-zinc-900 hover:bg-zinc-900/60">
                    <TableCell className="text-zinc-200">{campaign.campaignName}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.templateName}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.audienceCount.toLocaleString()}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.openRate}</TableCell>
                    <TableCell className="text-zinc-300">{campaign.clickRate}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusTone(campaign.status)}`}>{campaign.status}</span>
                    </TableCell>
                    <TableCell className="text-zinc-400">{campaign.sentAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WorkspaceShell>
  )
}
