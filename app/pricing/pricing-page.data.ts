import type { CheckoutItem } from "@/hooks/use-checkout-item"

export type PricingPlan = {
  id: string
  name: string
  monthly: number
  annual: number
  description: string
  features: string[]
  highlighted?: boolean
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    description: "Get started with basic email campaigns.",
    features: [
      "500 contacts",
      "Basic templates",
      "AI assistant (Fast mode)",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 15,
    annual: 12,
    description: "Full-featured campaigns for growing teams.",
    features: [
      "20,000 contacts",
      "All templates",
      "AI assistant (all modes)",
      "Campaigns workspace",
      "Scheduling & automation",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 49,
    annual: 39,
    description: "Maximum power for high-volume senders.",
    features: [
      "100,000 contacts",
      "Highest AI quota",
      "Custom SMTP & branding",
      "Advanced analytics",
      "Dedicated account manager",
      "SLA & SSO",
    ],
  },
]

export const pricingAddOns: CheckoutItem[] = [
  {
    id: "emails-10k",
    kind: "emails",
    name: "10,000 extra emails",
    description: "One-time send boost for launch or seasonal campaigns.",
    price: 39,
    billing: "one-time",
  },
  {
    id: "smtp-addon",
    kind: "smtp",
    name: "Custom SMTP add-on",
    description: "Use your own SMTP relay with dedicated sender reputation controls.",
    price: 29,
    billing: "monthly",
  },
]
