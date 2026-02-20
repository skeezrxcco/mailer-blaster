export type GenerateAiTextInput = {
  prompt: string
  system?: string
  model?: string
  temperature?: number
  provider?: string
  userId?: string
  userPlan?: string
}

export type GenerateAiTextResult = {
  text: string
  model: string
  provider: string
}

import { prisma } from "@/lib/prisma"

type AiProviderName = "openai" | "anthropic" | "deepseek" | "grok" | "llama"
type AiProviderPreference = "auto" | AiProviderName

type ProviderConfig = {
  provider: AiProviderName
  apiKey: string
  model: string
  baseUrl?: string
}

const DEFAULT_PRIORITY: AiProviderName[] = ["deepseek", "llama", "openai", "anthropic", "grok"]
const ONBOARDING_FREE_PLANS = new Set(["starter", "free", "trial"])
const DEFAULT_FREE_DAILY_PER_USER = 20
const DEFAULT_FREE_WEIGHTS: Record<AiProviderName, number> = {
  openai: 0.85,
  anthropic: 0.75,
  deepseek: 1.3,
  grok: 0.65,
  llama: 1.15,
}

function emptyUsageCounters(): Record<AiProviderName, number> {
  return {
    openai: 0,
    anthropic: 0,
    deepseek: 0,
    grok: 0,
    llama: 0,
  }
}

function asProviderName(value?: string | null): AiProviderName | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
  if (normalized === "openai" || normalized === "gpt") {
    return "openai"
  }
  if (normalized === "anthropic" || normalized === "claude") {
    return "anthropic"
  }
  if (normalized === "deepseek") {
    return "deepseek"
  }
  if (normalized === "grok" || normalized === "xai" || normalized === "x.ai") {
    return "grok"
  }
  if (normalized === "llama" || normalized === "meta" || normalized === "meta-llama") {
    return "llama"
  }
  return null
}

function resolveProviderPreference(): AiProviderPreference {
  const raw = (process.env.AI_PROVIDER ?? "auto").trim().toLowerCase()
  if (raw === "auto") return "auto"
  return asProviderName(raw) ?? "auto"
}

function parsePriority(): AiProviderName[] {
  const configured = (process.env.AI_PROVIDER_PRIORITY ?? "")
    .split(",")
    .map((entry) => asProviderName(entry))
    .filter((entry): entry is AiProviderName => Boolean(entry))

  const unique: AiProviderName[] = []
  for (const provider of [...configured, ...DEFAULT_PRIORITY]) {
    if (!unique.includes(provider)) unique.push(provider)
  }
  return unique
}

function parsePositiveInt(value: string | undefined): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function parsePositiveFloat(value: string | undefined): number {
  const parsed = Number.parseFloat(String(value ?? "").trim())
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function getDailyCaps(): Record<AiProviderName, number> {
  return {
    openai: parsePositiveInt(process.env.AI_FREE_DAILY_OPENAI),
    anthropic: parsePositiveInt(process.env.AI_FREE_DAILY_ANTHROPIC),
    deepseek: parsePositiveInt(process.env.AI_FREE_DAILY_DEEPSEEK),
    grok: parsePositiveInt(process.env.AI_FREE_DAILY_GROK),
    llama: parsePositiveInt(process.env.AI_FREE_DAILY_LLAMA),
  }
}

function hasAnyDailyCap(caps: Record<AiProviderName, number>): boolean {
  return Object.values(caps).some((cap) => cap > 0)
}

function getFreeWeights(): Record<AiProviderName, number> {
  return {
    openai: parsePositiveFloat(process.env.AI_FREE_WEIGHT_OPENAI) || DEFAULT_FREE_WEIGHTS.openai,
    anthropic: parsePositiveFloat(process.env.AI_FREE_WEIGHT_ANTHROPIC) || DEFAULT_FREE_WEIGHTS.anthropic,
    deepseek: parsePositiveFloat(process.env.AI_FREE_WEIGHT_DEEPSEEK) || DEFAULT_FREE_WEIGHTS.deepseek,
    grok: parsePositiveFloat(process.env.AI_FREE_WEIGHT_GROK) || DEFAULT_FREE_WEIGHTS.grok,
    llama: parsePositiveFloat(process.env.AI_FREE_WEIGHT_LLAMA) || DEFAULT_FREE_WEIGHTS.llama,
  }
}

function getPerUserDailyFreeLimit(): number {
  const configured = parsePositiveInt(process.env.AI_FREE_DAILY_PER_USER)
  return configured || DEFAULT_FREE_DAILY_PER_USER
}

function shouldRequireOnboardingCaps(): boolean {
  const configured = (process.env.AI_FREE_REQUIRE_CAPS ?? "").trim().toLowerCase()
  if (configured === "true" || configured === "1" || configured === "yes") return true
  if (configured === "false" || configured === "0" || configured === "no") return false
  return process.env.NODE_ENV === "production"
}

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function shouldUseOnboardingPool(userPlan?: string): boolean {
  const enabled = (process.env.AI_FREE_ONBOARDING_ENABLED ?? "true").trim().toLowerCase()
  if (enabled === "false" || enabled === "0" || enabled === "no") return false

  const configuredPlans = (process.env.AI_FREE_ONBOARDING_PLANS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const planPool = configuredPlans.length > 0 ? new Set(configuredPlans) : ONBOARDING_FREE_PLANS
  const plan = String(userPlan ?? "")
    .trim()
    .toLowerCase()

  if (!plan) return true
  return planPool.has(plan)
}

function buildProviderConfigs(): ProviderConfig[] {
  const providers: ProviderConfig[] = []

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    })
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
      baseUrl: (process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1").replace(/\/$/, ""),
    })
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      provider: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      baseUrl: (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1").replace(/\/$/, ""),
    })
  }

  if (process.env.GROK_API_KEY) {
    providers.push({
      provider: "grok",
      apiKey: process.env.GROK_API_KEY,
      model: process.env.GROK_MODEL ?? "grok-beta",
      baseUrl: (process.env.GROK_BASE_URL ?? "https://api.x.ai/v1").replace(/\/$/, ""),
    })
  }

  if (process.env.LLAMA_API_KEY) {
    providers.push({
      provider: "llama",
      apiKey: process.env.LLAMA_API_KEY,
      model: process.env.LLAMA_MODEL ?? "Llama-3.3-70B-Instruct",
      baseUrl: (process.env.LLAMA_BASE_URL ?? "https://api.llama.com/compat/v1").replace(/\/$/, ""),
    })
  }

  return providers
}

async function getDailyUsage(day: string, providers: AiProviderName[]): Promise<Record<AiProviderName, number>> {
  const usage = emptyUsageCounters()

  if (providers.length === 0) return usage

  try {
    const rows = await prisma.aiProviderDailyUsage.findMany({
      where: {
        day,
        provider: {
          in: providers,
        },
      },
      select: {
        provider: true,
        requests: true,
      },
    })

    for (const row of rows) {
      const provider = asProviderName(row.provider)
      if (!provider) continue
      usage[provider] = row.requests
    }
  } catch {
    // If tracking table is unavailable, keep zeroed counters.
  }

  return usage
}

async function bumpDailyUsage(day: string, provider: AiProviderName) {
  try {
    await prisma.aiProviderDailyUsage.upsert({
      where: {
        day_provider: {
          day,
          provider,
        },
      },
      create: {
        day,
        provider,
        requests: 1,
      },
      update: {
        requests: {
          increment: 1,
        },
      },
    })
  } catch {
    // Non-blocking metric update.
  }
}

async function getUserDailyUsage(day: string, userId: string): Promise<number> {
  try {
    const row = await prisma.aiUserDailyUsage.findUnique({
      where: {
        day_userId: {
          day,
          userId,
        },
      },
      select: {
        requests: true,
      },
    })
    return row?.requests ?? 0
  } catch {
    return 0
  }
}

async function bumpUserDailyUsage(day: string, userId: string) {
  try {
    await prisma.aiUserDailyUsage.upsert({
      where: {
        day_userId: {
          day,
          userId,
        },
      },
      create: {
        day,
        userId,
        requests: 1,
      },
      update: {
        requests: {
          increment: 1,
        },
      },
    })
  } catch {
    // Non-blocking metric update.
  }
}

function selectOnboardingProvider(
  availableProviders: AiProviderName[],
  caps: Record<AiProviderName, number>,
  usage: Record<AiProviderName, number>,
  weights: Record<AiProviderName, number>,
): AiProviderName | null {
  if (availableProviders.length === 0) return null
  let best: { provider: AiProviderName; score: number; remaining: number } | null = null
  for (const provider of availableProviders) {
    const cap = caps[provider]
    const used = usage[provider] ?? 0
    if (cap > 0 && used >= cap) continue
    const remaining = cap > 0 ? cap - used : Number.MAX_SAFE_INTEGER
    const utilization = cap > 0 ? used / cap : 0
    const score = utilization / (weights[provider] || 1)
    if (
      !best ||
      score < best.score ||
      (score === best.score && remaining > best.remaining)
    ) {
      best = { provider, score, remaining }
    }
  }

  return best?.provider ?? null
}

function buildAttemptOrder(
  available: ProviderConfig[],
  input: GenerateAiTextInput,
  selectedOnboardingProvider: AiProviderName | null,
  allowedProviders?: Set<AiProviderName>,
): AiProviderName[] {
  const availableNames = new Set(available.map((provider) => provider.provider))
  const ordered: AiProviderName[] = []

  const push = (provider: AiProviderName | null) => {
    if (!provider) return
    if (!availableNames.has(provider)) return
    if (allowedProviders && !allowedProviders.has(provider)) return
    if (!ordered.includes(provider)) ordered.push(provider)
  }

  push(asProviderName(input.provider))

  const preferredProvider = resolveProviderPreference()
  if (preferredProvider !== "auto") push(preferredProvider)

  push(selectedOnboardingProvider)

  const strict = (process.env.AI_PROVIDER_STRICT ?? "").trim().toLowerCase()
  if (preferredProvider !== "auto" && (strict === "true" || strict === "1")) {
    return ordered
  }

  for (const provider of parsePriority()) {
    push(provider)
  }

  for (const provider of available.map((entry) => entry.provider)) {
    push(provider)
  }

  return ordered
}

async function generateWithOpenAiCompatible(
  config: ProviderConfig,
  input: GenerateAiTextInput,
): Promise<GenerateAiTextResult> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model ?? config.model,
      temperature: input.temperature ?? 0.4,
      messages: [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${config.provider} error (${response.status}): ${errorText}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>
      }
    }>
  }

  const content = payload.choices?.[0]?.message?.content
  const text =
    typeof content === "string"
      ? content.trim()
      : (content ?? [])
          .map((part) => part.text ?? "")
          .join("\n")
          .trim()

  if (!text) {
    throw new Error(`${config.provider} response did not include text`)
  }

  return {
    text,
    model: input.model ?? config.model,
    provider: config.provider,
  }
}

async function generateWithAnthropic(config: ProviderConfig, input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model ?? config.model,
      max_tokens: parsePositiveInt(process.env.ANTHROPIC_MAX_TOKENS) || 1024,
      temperature: input.temperature ?? 0.4,
      system: input.system,
      messages: [
        { role: "user", content: input.prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`anthropic error (${response.status}): ${errorText}`)
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }

  const text = (payload.content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim()
  if (!text) {
    throw new Error("anthropic response did not include text")
  }

  return {
    text,
    model: input.model ?? config.model,
    provider: config.provider,
  }
}

export async function generateAiText(input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const providers = buildProviderConfigs()
  if (providers.length === 0) {
    throw new Error(
      "No AI provider API key configured. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, GROK_API_KEY, LLAMA_API_KEY.",
    )
  }

  const providerByName = new Map(providers.map((provider) => [provider.provider, provider] as const))
  const caps = getDailyCaps()
  const day = utcDayKey()
  const onboardingPool = shouldUseOnboardingPool(input.userPlan)
  const hasCaps = hasAnyDailyCap(caps)
  const usage = onboardingPool ? await getDailyUsage(day, providers.map((provider) => provider.provider)) : emptyUsageCounters()
  const freeWeights = getFreeWeights()

  if (onboardingPool && !hasCaps && shouldRequireOnboardingCaps()) {
    throw new Error("Free onboarding AI is enabled, but no daily provider caps are configured.")
  }

  const onboardingCandidates = onboardingPool
    ? providers
        .map((provider) => provider.provider)
        .filter((provider) => (!hasCaps ? true : caps[provider] > 0 && (usage[provider] ?? 0) < caps[provider]))
    : providers.map((provider) => provider.provider)

  if (onboardingPool && onboardingCandidates.length === 0) {
    throw new Error("Daily free AI capacity is exhausted for onboarding users. Please try later or upgrade your plan.")
  }

  const perUserLimit = onboardingPool ? getPerUserDailyFreeLimit() : 0
  if (onboardingPool && perUserLimit > 0 && input.userId) {
    const userUsage = await getUserDailyUsage(day, input.userId)
    if (userUsage >= perUserLimit) {
      throw new Error(`Daily free AI limit reached (${perUserLimit} requests). Upgrade to continue instantly.`)
    }
  }

  const selectedOnboardingProvider = onboardingPool
    ? selectOnboardingProvider(onboardingCandidates, caps, usage, freeWeights)
    : null
  const attempts = buildAttemptOrder(
    providers,
    input,
    selectedOnboardingProvider,
    onboardingPool ? new Set(onboardingCandidates) : undefined,
  )
  if (attempts.length === 0) {
    throw new Error("No eligible AI provider available for this request.")
  }
  const errors: string[] = []

  for (const providerName of attempts) {
    const config = providerByName.get(providerName)
    if (!config) continue

    try {
      let result: GenerateAiTextResult
      if (config.provider === "anthropic") {
        result = await generateWithAnthropic(config, input)
      } else {
        result = await generateWithOpenAiCompatible(config, input)
      }

      if (onboardingPool) {
        if (caps[config.provider] > 0) {
          await bumpDailyUsage(day, config.provider)
        }
        if (perUserLimit > 0 && input.userId) {
          await bumpUserDailyUsage(day, input.userId)
        }
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error"
      errors.push(`${providerName}: ${message}`)
    }
  }

  throw new Error(`All AI providers failed. ${errors.join(" | ")}`)
}
