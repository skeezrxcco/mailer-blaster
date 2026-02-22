"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CardSpotlight } from "@/components/ui/card-spotlight"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { Switch } from "@/components/ui/switch"
import { pricingAddOns, pricingPlans } from "@/app/pricing/pricing-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { type CheckoutItem, useCheckoutItem } from "@/hooks/use-checkout-item"
import { type SessionUserSummary } from "@/types/session-user"
import { cn } from "@/lib/utils"

export function PricingPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const router = useRouter()
  const { setCheckoutItem } = useCheckoutItem()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const isAnnual = billingCycle === "annual"
  const currentPlan = (initialUser.plan ?? "free").toLowerCase()

  const goToCheckout = (item: CheckoutItem) => {
    setCheckoutItem(item)
    router.push("/checkout")
  }

  return (
    <WorkspaceShell tab="pricing" pageTitle="Pricing" user={initialUser}>
      <div data-workspace-scroll className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="relative mb-8 overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,#0f766e_0%,#111827_45%,#020617_100%)] px-5 py-8 text-center sm:px-8">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/85">Simple, transparent pricing</p>
          <h2 className="mt-2.5 text-2xl font-semibold text-zinc-100 sm:text-3xl">Three plans. No surprises.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-200/90">Start free, upgrade when you need more power.</p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-zinc-950/70 px-4 py-2.5">
            <span className={cn("text-sm transition", isAnnual ? "text-zinc-500" : "text-zinc-100")}>Monthly</span>
            <Switch checked={isAnnual} onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")} />
            <span className={cn("text-sm transition", isAnnual ? "text-zinc-100" : "text-zinc-500")}>Annual</span>
            <Badge className="rounded-full bg-emerald-400/20 text-emerald-100">Save 20%</Badge>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => {
            const shownPrice = isAnnual ? plan.annual : plan.monthly
            const annualTotal = plan.annual * 12
            const isFree = plan.id === "free"
            const isCurrentPlan = currentPlan === plan.id
            const isUpgrade = !isCurrentPlan && !isFree

            return (
              <CardSpotlight
                key={plan.id}
                className={cn(
                  "relative overflow-hidden rounded-[28px] bg-zinc-950/45 p-0",
                  plan.highlighted ? "shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_30px_90px_rgba(14,116,144,0.35)]" : "",
                )}
              >
                <div className="relative z-20 flex min-h-[380px] flex-col rounded-[27px] px-6 py-6">
                  {plan.highlighted && !isCurrentPlan ? (
                    <div className="absolute right-4 top-4 rounded-full bg-sky-400/20 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-100">
                      Most popular
                    </div>
                  ) : null}
                  {isCurrentPlan ? (
                    <div className="absolute right-4 top-4 rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-200">
                      Current plan
                    </div>
                  ) : null}
                  <CardHeader className="relative px-0">
                    <CardTitle className="text-lg text-zinc-100">{plan.name}</CardTitle>
                    <CardDescription className="text-zinc-400">{plan.description}</CardDescription>
                    <div className="pt-3">
                      <p className="text-4xl font-semibold text-zinc-100">
                        {isFree ? "Free" : `$${shownPrice}`}
                      </p>
                      {!isFree ? (
                        <>
                          <p className="mt-0.5 text-xs text-zinc-500">{isAnnual ? "per month, billed annually" : "per month"}</p>
                          {isAnnual ? <p className="mt-1 text-xs text-emerald-300">${annualTotal}/year</p> : null}
                        </>
                      ) : (
                        <p className="mt-0.5 text-xs text-zinc-500">Forever free</p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-2.5 px-0 text-sm text-zinc-300">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <CircleCheckIcon size={14} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    <div className="flex-1" />
                    {isCurrentPlan ? (
                      <Button disabled className="mt-3 w-full rounded-xl bg-zinc-800 text-zinc-500">
                        Current plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className={cn(
                          "mt-3 w-full rounded-xl",
                          plan.highlighted ? "bg-sky-500 text-zinc-950 hover:bg-sky-400" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
                        )}
                        onClick={() =>
                          goToCheckout({
                            id: `plan-${plan.id}`,
                            kind: "plan",
                            name: `${plan.name} plan`,
                            description: plan.description,
                            price: shownPrice,
                            billing: isAnnual ? "annual" : "monthly",
                          })
                        }
                      >
                        Upgrade to {plan.name}
                      </Button>
                    ) : (
                      <Button
                        className="mt-3 w-full rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        onClick={() => router.push("/chat?newChat=1")}
                      >
                        Get started
                      </Button>
                    )}
                  </CardContent>
                </div>
              </CardSpotlight>
            )
          })}
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <CardSpotlight className="relative overflow-hidden rounded-[28px] bg-zinc-950/45 p-0">
            <div className="relative z-20 rounded-[27px] p-6">
              <CardHeader className="px-0 pb-3">
                <CardTitle className="text-zinc-100">Add-ons</CardTitle>
                <CardDescription className="text-zinc-400">Attach extras to your current plan in one click.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-0">
                {pricingAddOns.map((addon) => (
                  <div key={addon.id} className="flex flex-col gap-3 rounded-2xl bg-zinc-900/65 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{addon.name}</p>
                      <p className="text-xs text-zinc-400">{addon.description}</p>
                    </div>
                    <Button className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => goToCheckout(addon)}>
                      Add ${addon.price}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </div>
          </CardSpotlight>
          <CardSpotlight className="relative overflow-hidden rounded-[28px] bg-zinc-950/45 p-0">
            <div className="relative z-20 rounded-[27px] p-6">
              <CardHeader className="px-0">
                <CardTitle className="text-zinc-100">Need custom volume?</CardTitle>
                <CardDescription className="text-zinc-400">For agencies, multi-brand groups, and compliance-heavy industries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 px-0 text-sm text-zinc-300">
                <p>• Multi-tenant management</p>
                <p>• Advanced permissions + audit logs</p>
                <p>• Dedicated onboarding specialist</p>
                <Button className="mt-4 w-full rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400">Contact sales</Button>
              </CardContent>
            </div>
          </CardSpotlight>
        </div>
      </div>
    </WorkspaceShell>
  )
}
