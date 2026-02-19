"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  checkoutPresets,
  currentPlanFacts,
  profileData,
  referralsData,
  settingsSectionFromParam,
  usageByChannel,
  usageChartConfig,
  usageLimitChartConfig,
  usageLimitData,
  usageTimeline,
} from "@/app/settings/settings-page.data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { type CheckoutItem, useCheckoutItem } from "@/hooks/use-checkout-item"

function SettingsUsageCharts() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-0 bg-zinc-950/68">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-zinc-200">Email sends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-zinc-100">8,412</p>
            <p className="text-xs text-zinc-400">of 20,000 this cycle</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-zinc-950/68">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-zinc-200">Avg. open rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-300">52.4%</p>
            <p className="text-xs text-zinc-400">last 7 days</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-zinc-950/68">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-zinc-200">Credits remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-200">120</p>
            <p className="text-xs text-zinc-400">renews in 12 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-0 bg-zinc-950/72">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100">Sends vs opens</CardTitle>
            <CardDescription>Last 7 days campaign performance.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={usageChartConfig} className="h-[250px] w-full">
              <AreaChart data={usageTimeline}>
                <defs>
                  <linearGradient id="fillSends" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-sends)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-sends)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="fillOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-opens)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-opens)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="sends" stroke="var(--color-sends)" fill="url(#fillSends)" strokeWidth={2.2} />
                <Area type="monotone" dataKey="opens" stroke="var(--color-opens)" fill="url(#fillOpens)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-zinc-950/72">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100">Usage mix</CardTitle>
            <CardDescription>Where credits are consumed.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={usageChartConfig} className="h-[250px] w-full">
              <BarChart data={usageByChannel} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.12} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="channel" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={10} fill="var(--color-value)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 bg-zinc-950/72">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100">Usage limit</CardTitle>
          <CardDescription>Current cycle usage against plan cap.</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <ChartContainer config={usageLimitChartConfig} className="h-[170px] w-full">
            <BarChart data={usageLimitData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="limit" radius={10} fill="var(--color-limit)" />
              <Bar dataKey="used" radius={10} fill="var(--color-used)" />
            </BarChart>
          </ChartContainer>
          <p className="mt-2 text-xs text-zinc-300">8,412 used out of 20,000 total (42.1%)</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const settingsSection = settingsSectionFromParam(searchParams.get("section"))
  const { setCheckoutItem } = useCheckoutItem()

  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")

  const goToCheckout = (item: CheckoutItem) => {
    setCheckoutItem(item)
    router.push("/checkout")
  }

  return (
    <WorkspaceShell tab="settings" pageTitle="Settings">
      <div data-workspace-scroll className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="relative mb-5 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#111827_42%,#020617_100%)] px-5 py-5 sm:px-6">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-200/85">Account control center</p>
          <p className="mt-1 text-sm text-zinc-200/90">Manage profile, plan, usage, referrals, pricing, and checkout from the sidebar.</p>
          <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-100">Workspace admin: ricardo@example.com</div>
        </div>

        {settingsSection === "profile" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Profile</CardTitle>
                <CardDescription>Identity and brand defaults.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={profileData.name} readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value={profileData.email} readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value={profileData.timezone} readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Brand profile</CardTitle>
                <CardDescription>Applied to generated newsletters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p>• Sender name: {profileData.senderName}</p>
                <p>• Reply-to: {profileData.replyTo}</p>
                <p>• Default locale: {profileData.locale}</p>
                <p>• Content style: {profileData.style}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {settingsSection === "plan" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Current plan</CardTitle>
                <CardDescription>Growth plan active</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                {currentPlanFacts.map((fact) => (
                  <p key={fact}>• {fact}</p>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Upgrade plan</CardTitle>
                <CardDescription>Move to a higher tier anytime.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
                  onClick={() => goToCheckout(checkoutPresets.growthPlan)}
                >
                  Choose plan
                </Button>
                <Button
                  className="w-full rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  onClick={() => goToCheckout(checkoutPresets.extraEmails10k)}
                >
                  Add 10k emails - $39
                </Button>
                <Button
                  className="w-full rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  onClick={() => goToCheckout(checkoutPresets.extraEmails50k)}
                >
                  Add 50k emails - $149
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-0 bg-zinc-950/70 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-zinc-100">Custom SMTP</CardTitle>
                <CardDescription>Use your own sender infrastructure.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                <Input value={smtpHost} onChange={(event) => setSmtpHost(event.target.value)} placeholder="SMTP host" className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value={smtpPort} onChange={(event) => setSmtpPort(event.target.value)} placeholder="Port" className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value={smtpUser} onChange={(event) => setSmtpUser(event.target.value)} placeholder="Username" className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value={smtpFrom} onChange={(event) => setSmtpFrom(event.target.value)} placeholder="From email" className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Button
                  className="md:col-span-2 rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
                  onClick={() =>
                    goToCheckout({
                      id: "smtp-addon",
                      kind: "smtp",
                      name: "Custom SMTP add-on",
                      description: smtpHost ? `SMTP via ${smtpHost}:${smtpPort}` : "Bring your own SMTP relay",
                      price: 29,
                      billing: "monthly",
                    })
                  }
                >
                  Add SMTP - $29/mo
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {settingsSection === "usage" ? <SettingsUsageCharts /> : null}

        {settingsSection === "referals" ? (
          <Card className="rounded-3xl border-0 bg-zinc-950/70">
            <CardHeader>
              <CardTitle className="text-zinc-100">Referals</CardTitle>
              <CardDescription>Invite teams and earn credits for successful referrals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={referralsData.link} readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
              <p className="text-sm text-zinc-300">{referralsData.rewardText}</p>
              <p className="text-xs text-zinc-400">{referralsData.quarterStatsText}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </WorkspaceShell>
  )
}
