import { getModelForMode, isModelAccessible } from "@/lib/ai/model-registry"

export type AiModelMode = "essential" | "balanced" | "premium"

export type AiModelProfile = {
  mode: AiModelMode
  provider?: string
  model?: string
  temperature: number
  maxOutputTokens: number
  qualityInstruction: string
}

function isProPlan(plan: string | undefined) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  return normalized === "pro" || normalized === "premium" || normalized === "enterprise"
}

export function normalizeAiModelMode(value: string | undefined | null): AiModelMode {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
  if (normalized === "essential") return "essential"
  if (normalized === "balanced") return "balanced"
  if (normalized === "premium") return "premium"
  return "essential"
}

export function resolveAiModelProfile(input: { mode?: string | null; userPlan?: string }): AiModelProfile {
  const requested = normalizeAiModelMode(input.mode)
  const pro = isProPlan(input.userPlan)
  const plan = input.userPlan ?? "free"

  const effectiveMode = !pro && !isModelAccessible(requested, plan) ? "essential" : requested

  const registryEntry = getModelForMode(effectiveMode)

  return {
    mode: registryEntry.mode,
    provider: process.env[`AI_MODE_${effectiveMode.toUpperCase()}_PROVIDER`] ?? registryEntry.provider,
    model: process.env[`AI_MODE_${effectiveMode.toUpperCase()}_MODEL`] ?? registryEntry.model,
    temperature: registryEntry.temperature,
    maxOutputTokens: registryEntry.maxOutputTokens,
    qualityInstruction: registryEntry.qualityInstruction,
  }
}
