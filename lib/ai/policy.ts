import type { GenerateAiTextInput } from "@/lib/ai"

export const AI_PROVIDER_NAMES = ["openai", "anthropic", "deepseek", "grok", "llama", "openrouter"] as const
export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number]

type ProviderPolicy = {
  allowedProviders: Set<AiProviderName>
  preferredOrder: AiProviderName[]
  premiumProviders: Set<AiProviderName>
}

const DEFAULT_STARTER_ALLOW: AiProviderName[] = ["llama", "deepseek", "openrouter", "openai"]
const DEFAULT_PRO_ALLOW: AiProviderName[] = [...AI_PROVIDER_NAMES]
const DEFAULT_PREMIUM: AiProviderName[] = ["openai", "anthropic", "grok"]

function asProviderName(value: string): AiProviderName | null {
  const normalized = value.trim().toLowerCase()
  if (normalized === "openai") return "openai"
  if (normalized === "anthropic") return "anthropic"
  if (normalized === "deepseek") return "deepseek"
  if (normalized === "grok") return "grok"
  if (normalized === "llama") return "llama"
  if (normalized === "openrouter") return "openrouter"
  return null
}

function parseProviderList(raw: string | undefined, fallback: AiProviderName[]) {
  const parsed = String(raw ?? "")
    .split(",")
    .map((entry) => asProviderName(entry))
    .filter((entry): entry is AiProviderName => Boolean(entry))

  return parsed.length ? parsed : fallback
}

function isProPlan(plan: string | undefined) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  return normalized === "pro" || normalized === "premium" || normalized === "enterprise"
}

export function resolveProviderPolicy(input: Pick<GenerateAiTextInput, "userPlan">): ProviderPolicy {
  const starterAllow = parseProviderList(process.env.AI_POLICY_STARTER_ALLOW, DEFAULT_STARTER_ALLOW)
  const proAllow = parseProviderList(process.env.AI_POLICY_PRO_ALLOW, DEFAULT_PRO_ALLOW)
  const premiumProviders = new Set(parseProviderList(process.env.AI_POLICY_PREMIUM_PROVIDERS, DEFAULT_PREMIUM))

  const allowed = isProPlan(input.userPlan) ? proAllow : starterAllow
  const preferredOrder = isProPlan(input.userPlan)
    ? parseProviderList(process.env.AI_POLICY_PRO_PRIORITY, proAllow)
    : parseProviderList(process.env.AI_POLICY_STARTER_PRIORITY, starterAllow)

  return {
    allowedProviders: new Set(allowed),
    preferredOrder,
    premiumProviders,
  }
}

export function filterAllowedProviders(providers: AiProviderName[], policy: ProviderPolicy) {
  return providers.filter((provider) => policy.allowedProviders.has(provider))
}

export function isPremiumProvider(provider: AiProviderName, policy: ProviderPolicy) {
  return policy.premiumProviders.has(provider)
}

