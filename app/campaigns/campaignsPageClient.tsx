"use client"

import { BarChart3, CalendarClock, Cpu, PlugZap } from "lucide-react"

import { campaignsOps, pluginIntegrations } from "@/app/campaigns/campaigns-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type SessionUserSummary } from "@/types/session-user"

function statusTone(status: "live" | "scheduled" | "draft") {
  if (status === "live") return "bg-emerald-400/20 text-emerald-200"
  if (status === "scheduled") return "bg-sky-400/20 text-sky-200"
  return "bg-zinc-700/60 text-zinc-200"
}

export function CampaignsPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const isProUser = initialUser.plan === "pro"

  return (
    <WorkspaceShell tab="campaigns" pageTitle="Campaigns control center" user={initialUser}>
      <div data-workspace-scroll className="scrollbar-hide h-full min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Campaigns control center</h2>
            <p className="text-sm text-zinc-400">Schedule, monitor KPIs, orchestrate flows, and manage integrations.</p>
          </div>
          <Badge className="rounded-full bg-violet-400/20 text-violet-200">Pro</Badge>
        </div>

        {!isProUser ? (
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-zinc-100">Campaigns is a Pro feature</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-300">Upgrade to Pro to unlock campaign orchestration, scheduling, KPI monitoring, and plugins.</p>
              <Button className="mt-4 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200">Upgrade to Pro</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                <CardContent className="flex items-center gap-3 p-4">
                  <CalendarClock className="h-5 w-5 text-sky-300" />
                  <div>
                    <p className="text-xs text-zinc-400">Scheduled campaigns</p>
                    <p className="text-lg font-semibold text-zinc-100">14</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                <CardContent className="flex items-center gap-3 p-4">
                  <BarChart3 className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-xs text-zinc-400">Avg open rate</p>
                    <p className="text-lg font-semibold text-zinc-100">47.9%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                <CardContent className="flex items-center gap-3 p-4">
                  <Cpu className="h-5 w-5 text-amber-300" />
                  <div>
                    <p className="text-xs text-zinc-400">Automation rules</p>
                    <p className="text-lg font-semibold text-zinc-100">22</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/75">
                <CardContent className="flex items-center gap-3 p-4">
                  <PlugZap className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-xs text-zinc-400">Connected plugins</p>
                    <p className="text-lg font-semibold text-zinc-100">2</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
              <CardHeader>
                <CardTitle className="text-zinc-100">Campaign operations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-300">Campaign</TableHead>
                      <TableHead className="text-zinc-300">Status</TableHead>
                      <TableHead className="text-zinc-300">Audience</TableHead>
                      <TableHead className="text-zinc-300">Next run</TableHead>
                      <TableHead className="text-zinc-300">Open</TableHead>
                      <TableHead className="text-zinc-300">Click</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignsOps.map((campaign) => (
                      <TableRow key={campaign.id} className="border-zinc-900 hover:bg-zinc-900/60">
                        <TableCell className="text-zinc-200">{campaign.name}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(campaign.status)}`}>{campaign.status}</span>
                        </TableCell>
                        <TableCell className="text-zinc-300">{campaign.audience}</TableCell>
                        <TableCell className="text-zinc-300">{campaign.nextRun}</TableCell>
                        <TableCell className="text-zinc-300">{campaign.openRate}</TableCell>
                        <TableCell className="text-zinc-300">{campaign.clickRate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
              <CardHeader>
                <CardTitle className="text-zinc-100">Plugin integrations</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {pluginIntegrations.map((plugin) => (
                  <div key={plugin.id} className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{plugin.name}</p>
                      <p className="text-xs text-zinc-400">{plugin.category}</p>
                    </div>
                    <Badge
                      className={
                        plugin.status === "connected"
                          ? "rounded-full bg-emerald-400/20 text-emerald-200"
                          : "rounded-full bg-zinc-700 text-zinc-200"
                      }
                    >
                      {plugin.status === "connected" ? "Connected" : "Not connected"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </WorkspaceShell>
  )
}
