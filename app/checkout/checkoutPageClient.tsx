"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { IdCardIcon } from "@/components/ui/id-card"
import { LockIcon } from "@/components/ui/lock"
import { ShieldCheckIcon } from "@/components/ui/shield-check"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { useCheckoutItem } from "@/hooks/use-checkout-item"

export function CheckoutPageClient() {
  const { checkoutItem } = useCheckoutItem()

  if (!checkoutItem) {
    return (
      <WorkspaceShell tab="checkout" pageTitle="Checkout">
        <div className="flex min-h-0 h-full items-center justify-center p-4 md:p-6">
          <Card className="w-full max-w-xl rounded-3xl border-0 bg-zinc-950/72">
            <CardHeader>
              <CardTitle className="text-zinc-100">Checkout is empty</CardTitle>
              <CardDescription>Select a plan or add-on from Pricing or Settings first.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </WorkspaceShell>
    )
  }

  const amountLabel = `$${checkoutItem.price.toFixed(2)}`
  const billingLabel =
    checkoutItem.billing === "monthly" ? "per month" : checkoutItem.billing === "annual" ? "per year" : "one-time payment"

  return (
    <WorkspaceShell tab="checkout" pageTitle="Checkout">
      <div data-workspace-scroll className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="mb-5">
          <p className="text-sm text-zinc-400">Stripe-inspired payment experience with instant activation after payment.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="rounded-3xl border-0 bg-zinc-950/72 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <LockIcon size={16} className="h-4 w-4 text-emerald-300" />
                Payment details
              </CardTitle>
              <CardDescription>Your payment information is encrypted and secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex rounded-xl bg-zinc-900/80 p-1 text-xs">
                <button type="button" className="rounded-lg bg-zinc-100 px-3 py-1.5 font-medium text-zinc-900">
                  Card
                </button>
                <button type="button" className="rounded-lg px-3 py-1.5 text-zinc-400">
                  Link
                </button>
              </div>

              <div className="space-y-3">
                <Input value="Ricardo Pires" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
                <Input value="ricardo@example.com" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
                <Input value="4242 4242 4242 4242" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input value="12 / 29" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
                <Input value="CVC 123" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
              </div>

              <div className="rounded-2xl bg-zinc-900/70 px-3 py-3 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon size={16} className="h-4 w-4 text-emerald-300" />
                  256-bit TLS encryption. PCI-compliant payment processing.
                </div>
              </div>

              <Button className="h-11 w-full rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300">Pay {amountLabel}</Button>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-3xl border-0 bg-zinc-950/68 xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <IdCardIcon size={16} className="h-4 w-4 text-sky-300" />
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <div className="rounded-2xl bg-zinc-900/70 p-3">
                <p className="font-medium text-zinc-100">{checkoutItem.name}</p>
                <p className="text-xs text-zinc-400">{checkoutItem.description}</p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{amountLabel}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>$0.00</span>
                </p>
                <p className="flex items-center justify-between pt-1 text-base font-semibold text-zinc-100">
                  <span>Total</span>
                  <span>{amountLabel}</span>
                </p>
                <p className="text-xs text-zinc-500">{billingLabel}</p>
              </div>
              <div className="space-y-1 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <CircleCheckIcon size={14} className="h-3.5 w-3.5 text-emerald-300" />
                  Instant account activation
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheckIcon size={14} className="h-3.5 w-3.5 text-emerald-300" />
                  Cancel anytime from settings
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkspaceShell>
  )
}
