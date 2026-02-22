import type { AiModelMode } from "@/lib/ai/model-mode"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelRegistryEntry = {
  id: string
  provider: string
  model: string
  label: string
  mode: AiModelMode
  inputCostPer1kTokens: number
  outputCostPer1kTokens: number
  maxOutputTokens: number
  temperature: number
  qualityInstruction: string
  /** "low" | "medium" | "high" — relative expense indicator for the UI */
  expenseTier: "low" | "medium" | "high"
  /** How fast this model consumes quota relative to the base (essential) model */
  quotaMultiplier: number
}

export type PlanUsageBudget = {
  plan: string
  /** Max USD spend on provider costs per calendar month */
  monthlyBudgetUsd: number
  /** Which model modes this plan can access */
  modelAccess: AiModelMode[]
}

export type PlatformRevenueConfig = {
  platformCutPercent: number
  freeUserFundPercent: number
}

// ---------------------------------------------------------------------------
// Revenue split — 15% platform, 40% of that funds free users
// ---------------------------------------------------------------------------

export const PLATFORM_REVENUE_CONFIG: PlatformRevenueConfig = {
  platformCutPercent: 15,
  freeUserFundPercent: 40,
}

// ---------------------------------------------------------------------------
// Plan budgets — expressed in provider-cost USD, NOT tokens.
// 3 tiers only: Free, Pro ($15/mo), Premium ($49/mo).
// Internal cost accounting — never exposed to users.
// ---------------------------------------------------------------------------

export const PLAN_USAGE_BUDGETS: PlanUsageBudget[] = [
  {
    plan: "free",
    monthlyBudgetUsd: 0.25,
    modelAccess: ["essential"],
  },
  {
    plan: "pro",
    monthlyBudgetUsd: 7.50,
    modelAccess: ["essential", "balanced", "premium"],
  },
  {
    plan: "premium",
    monthlyBudgetUsd: 30.00,
    modelAccess: ["essential", "balanced", "premium"],
  },
]

// ---------------------------------------------------------------------------
// Model registry — real provider pricing (USD per 1K tokens)
// ---------------------------------------------------------------------------

export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    id: "mini-openrouter-llama",
    provider: "openrouter",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Mini (Llama)",
    mode: "essential",
    inputCostPer1kTokens: 0.0001,
    outputCostPer1kTokens: 0.00015,
    maxOutputTokens: 700,
    temperature: 0.22,
    qualityInstruction:
      "Maximize quality under tight budget: be precise, avoid fluff, use short structured output, validate assumptions, and produce actionable copy.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "mini-deepseek",
    provider: "deepseek",
    model: "deepseek-chat",
    label: "Mini (DeepSeek)",
    mode: "essential",
    inputCostPer1kTokens: 0.00014,
    outputCostPer1kTokens: 0.00028,
    maxOutputTokens: 700,
    temperature: 0.22,
    qualityInstruction:
      "Maximize quality under tight budget: be precise, avoid fluff, use short structured output, validate assumptions, and produce actionable copy.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "balanced-openai-mini",
    provider: "openai",
    model: "gpt-4.1-mini",
    label: "Standard (GPT-4.1 Mini)",
    mode: "balanced",
    inputCostPer1kTokens: 0.0004,
    outputCostPer1kTokens: 0.0016,
    maxOutputTokens: 900,
    temperature: 0.28,
    qualityInstruction:
      "Prioritize high signal: clear campaign strategy, concise sections, practical next actions, and consistent tone aligned to audience and goal.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  {
    id: "balanced-anthropic-haiku",
    provider: "anthropic",
    model: "claude-3-5-haiku-latest",
    label: "Standard (Claude Haiku)",
    mode: "balanced",
    inputCostPer1kTokens: 0.00025,
    outputCostPer1kTokens: 0.00125,
    maxOutputTokens: 900,
    temperature: 0.28,
    qualityInstruction:
      "Prioritize high signal: clear campaign strategy, concise sections, practical next actions, and consistent tone aligned to audience and goal.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  {
    id: "premium-openai-gpt4",
    provider: "openai",
    model: "gpt-4.1",
    label: "Premium (GPT-4.1)",
    mode: "premium",
    inputCostPer1kTokens: 0.002,
    outputCostPer1kTokens: 0.008,
    maxOutputTokens: 1200,
    temperature: 0.2,
    qualityInstruction:
      "Deliver premium quality: accurate, concrete, and conversion-focused copy with clear structure, strong CTA logic, and polished wording.",
    expenseTier: "high",
    quotaMultiplier: 8,
  },
  {
    id: "premium-anthropic-sonnet",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    label: "Premium (Claude Sonnet)",
    mode: "premium",
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxOutputTokens: 1200,
    temperature: 0.2,
    qualityInstruction:
      "Deliver premium quality: accurate, concrete, and conversion-focused copy with clear structure, strong CTA logic, and polished wording.",
    expenseTier: "high",
    quotaMultiplier: 8,
  },
]

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getModelForMode(mode: AiModelMode): ModelRegistryEntry {
  const envProvider = process.env[`AI_MODE_${mode.toUpperCase()}_PROVIDER`]
  const envModel = process.env[`AI_MODE_${mode.toUpperCase()}_MODEL`]

  if (envProvider && envModel) {
    const match = MODEL_REGISTRY.find(
      (entry) => entry.provider === envProvider && entry.model === envModel,
    )
    if (match) return match
  }

  const candidates = MODEL_REGISTRY.filter((entry) => entry.mode === mode)
  return candidates[0] ?? MODEL_REGISTRY[0]
}

export function getPlanBudget(plan: string): PlanUsageBudget {
  const normalized = (plan ?? "free").trim().toLowerCase()
  return (
    PLAN_USAGE_BUDGETS.find((entry) => entry.plan === normalized) ??
    PLAN_USAGE_BUDGETS[0]
  )
}

export function isModelAccessible(mode: AiModelMode, plan: string): boolean {
  const budget = getPlanBudget(plan)
  return budget.modelAccess.includes(mode)
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

export function estimateTokenCost(
  modelEntry: ModelRegistryEntry,
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1000) * modelEntry.inputCostPer1kTokens
  const outputCost = (outputTokens / 1000) * modelEntry.outputCostPer1kTokens
  return Number((inputCost + outputCost).toFixed(6))
}

export function estimateTokensFromText(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

/**
 * Estimate the provider cost (USD) for a single average message exchange.
 * Assumes ~300 input tokens (prompt + system) and model's maxOutputTokens.
 */
export function estimatePerMessageCostUsd(modelEntry: ModelRegistryEntry): number {
  const avgInputTokens = 300
  const avgOutputTokens = Math.min(modelEntry.maxOutputTokens, 600)
  return estimateTokenCost(modelEntry, avgInputTokens, avgOutputTokens)
}

/**
 * Estimate how many messages a user can send with their remaining budget on a given model.
 */
export function estimateRemainingMessages(
  modelEntry: ModelRegistryEntry,
  remainingBudgetUsd: number,
): number {
  const perMessage = estimatePerMessageCostUsd(modelEntry)
  if (perMessage <= 0) return 9999
  return Math.floor(remainingBudgetUsd / perMessage)
}

/**
 * Convert a provider cost in USD to a credit-style integer for backward compat.
 */
export function tokenCostToCredits(
  modelEntry: ModelRegistryEntry,
  inputTokens: number,
  outputTokens: number,
): number {
  const costUsd = estimateTokenCost(modelEntry, inputTokens, outputTokens)

  const modeMultiplier =
    modelEntry.mode === "premium" ? 3.0 : modelEntry.mode === "balanced" ? 1.5 : 1.0

  const rawCredits = Math.ceil(costUsd * 10000 * modeMultiplier)
  return Math.max(1, Math.min(rawCredits, 50))
}

// ---------------------------------------------------------------------------
// Revenue split helpers
// ---------------------------------------------------------------------------

export function calculateFreeUserTokenAllocation(
  subscriptionRevenue: number,
): { platformRevenue: number; freeUserFund: number; platformProfit: number } {
  const platformCut =
    subscriptionRevenue * (PLATFORM_REVENUE_CONFIG.platformCutPercent / 100)
  const freeUserFund =
    platformCut * (PLATFORM_REVENUE_CONFIG.freeUserFundPercent / 100)
  const platformProfit = platformCut - freeUserFund

  return {
    platformRevenue: platformCut,
    freeUserFund,
    platformProfit,
  }
}

// ---------------------------------------------------------------------------
// UI-facing serializable model info (safe to send to the client)
// ---------------------------------------------------------------------------

export type ModelInfoForClient = {
  id: string
  label: string
  mode: AiModelMode
  expenseTier: "low" | "medium" | "high"
  quotaMultiplier: number
}

export function getModelsForClient(plan: string): ModelInfoForClient[] {
  const budget = getPlanBudget(plan)
  const seen = new Set<AiModelMode>()

  return MODEL_REGISTRY
    .filter((entry) => {
      if (!budget.modelAccess.includes(entry.mode)) return false
      if (seen.has(entry.mode)) return false
      seen.add(entry.mode)
      return true
    })
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      mode: entry.mode,
      expenseTier: entry.expenseTier,
      quotaMultiplier: entry.quotaMultiplier,
    }))
}
