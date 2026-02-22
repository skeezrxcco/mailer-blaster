export type GenerateAiTextInput = {
  prompt: string
  system?: string
  model?: string
  temperature?: number
  mode?: "essential" | "balanced" | "premium"
  provider?: string
  userId?: string
  userPlan?: string
  maxOutputTokens?: number
}

export type GenerateAiProviderAttempt = {
  provider: string
  model: string
  status: "SUCCESS" | "ERROR"
  latencyMs?: number | null
  tokenIn?: number | null
  tokenOut?: number | null
  estimatedCostUsd?: number | null
  errorCode?: string | null
}

export type GenerateAiTextResult = {
  text: string
  model: string
  provider: string
  latencyMs?: number | null
  tokenIn?: number | null
  tokenOut?: number | null
  estimatedCostUsd?: number | null
  attempts?: GenerateAiProviderAttempt[]
}

import { prisma } from "@/lib/prisma"
import { filterAllowedProviders, resolveProviderPolicy, type AiProviderName as PolicyProviderName } from "@/lib/ai/policy"

export type GenerateAiTextStreamChunk =
  | {
      type: "token"
      token: string
    }
  | {
      type: "done"
      text: string
      model: string
      provider: string
      attempts: GenerateAiProviderAttempt[]
    }

type AiProviderName = "openai" | "anthropic" | "deepseek" | "grok" | "llama" | "openrouter"
type AiProviderPreference = "auto" | AiProviderName

type ProviderConfig = {
  provider: AiProviderName
  apiKey?: string
  model: string
  baseUrl?: string
  headers?: Record<string, string>
}

type ProviderSelectionFallback = {
  fallbackText: string
}

type ProviderSelectionActive = {
  fallbackText: null
  providers: ProviderConfig[]
  providerByName: Map<AiProviderName, ProviderConfig>
  attemptOrder: AiProviderName[]
  onboardingPool: boolean
  caps: Record<AiProviderName, number>
  day: string
  perUserLimit: number
}

const DEFAULT_PRIORITY: AiProviderName[] = ["deepseek", "llama", "openrouter", "openai", "anthropic", "grok"]
const ONBOARDING_FREE_PLANS = new Set(["starter", "free", "trial"])
const DEFAULT_FREE_DAILY_PER_USER = 20
const DEFAULT_MAX_OUTPUT_TOKENS = 640
const DEFAULT_FREE_WEIGHTS: Record<AiProviderName, number> = {
  openai: 0.85,
  anthropic: 0.75,
  deepseek: 1.3,
  grok: 0.65,
  llama: 1.15,
  openrouter: 1.25,
}

function emptyUsageCounters(): Record<AiProviderName, number> {
  return {
    openai: 0,
    anthropic: 0,
    deepseek: 0,
    grok: 0,
    llama: 0,
    openrouter: 0,
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
  if (normalized === "openrouter" || normalized === "router") {
    return "openrouter"
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

function resolveMaxOutputTokens(input: GenerateAiTextInput) {
  const byInput = parsePositiveInt(String(input.maxOutputTokens ?? ""))
  if (byInput > 0) return byInput
  const byEnv = parsePositiveInt(process.env.AI_MAX_OUTPUT_TOKENS)
  if (byEnv > 0) return byEnv
  return DEFAULT_MAX_OUTPUT_TOKENS
}

function estimateTokens(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

function clampTextToTokenBudget(text: string, maxOutputTokens: number) {
  const normalized = text.trim()
  if (!normalized) return normalized
  if (estimateTokens(normalized) <= maxOutputTokens) return normalized
  const maxChars = Math.max(64, maxOutputTokens * 4)
  return normalized.slice(0, maxChars).trimEnd()
}

function estimateCostUsd(provider: AiProviderName, tokenIn: number, tokenOut: number) {
  const ratesPerThousand: Record<AiProviderName, { in: number; out: number }> = {
    openai: { in: 0.0004, out: 0.0016 },
    anthropic: { in: 0.00025, out: 0.00125 },
    deepseek: { in: 0.00014, out: 0.00028 },
    grok: { in: 0.0007, out: 0.0015 },
    llama: { in: 0.0001, out: 0.0001 },
    openrouter: { in: 0.0001, out: 0.00015 },
  }

  const pricing = ratesPerThousand[provider]
  const cost = (tokenIn / 1000) * pricing.in + (tokenOut / 1000) * pricing.out
  return Number.isFinite(cost) ? Number(cost.toFixed(6)) : null
}

function normalizeErrorCode(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes("429") || normalized.includes("rate")) return "RATE_LIMIT"
  if (normalized.includes("quota")) return "QUOTA"
  if (normalized.includes("401") || normalized.includes("403")) return "AUTH"
  if (normalized.includes("timeout")) return "TIMEOUT"
  return "UNKNOWN"
}

function getDailyCaps(): Record<AiProviderName, number> {
  return {
    openai: parsePositiveInt(process.env.AI_FREE_DAILY_OPENAI),
    anthropic: parsePositiveInt(process.env.AI_FREE_DAILY_ANTHROPIC),
    deepseek: parsePositiveInt(process.env.AI_FREE_DAILY_DEEPSEEK),
    grok: parsePositiveInt(process.env.AI_FREE_DAILY_GROK),
    llama: parsePositiveInt(process.env.AI_FREE_DAILY_LLAMA),
    openrouter: parsePositiveInt(process.env.AI_FREE_DAILY_OPENROUTER),
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
    openrouter: parsePositiveFloat(process.env.AI_FREE_WEIGHT_OPENROUTER) || DEFAULT_FREE_WEIGHTS.openrouter,
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

function isLikelyLocalBaseUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return host === "localhost" || host === "127.0.0.1" || host === "host.docker.internal" || host === "ollama"
  } catch {
    return false
  }
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

  const llamaBaseUrl = (process.env.LLAMA_BASE_URL ?? "https://api.llama.com/compat/v1").replace(/\/$/, "")
  const llamaApiKey = String(process.env.LLAMA_API_KEY ?? "").trim()
  const llamaAllowNoKey = (process.env.LLAMA_ALLOW_NO_KEY ?? "").trim().toLowerCase()
  const canUseKeylessLlama = (llamaAllowNoKey === "true" || llamaAllowNoKey === "1" || llamaAllowNoKey === "yes") && isLikelyLocalBaseUrl(llamaBaseUrl)

  if (llamaApiKey || canUseKeylessLlama) {
    providers.push({
      provider: "llama",
      apiKey: llamaApiKey || undefined,
      model: process.env.LLAMA_MODEL ?? "Llama-3.3-70B-Instruct",
      baseUrl: llamaBaseUrl,
    })
  }

  if (process.env.OPENROUTER_API_KEY) {
    const headers: Record<string, string> = {}
    const referer = String(process.env.OPENROUTER_HTTP_REFERER ?? "").trim()
    const title = String(process.env.OPENROUTER_X_TITLE ?? "").trim()
    if (referer) headers["HTTP-Referer"] = referer
    if (title) headers["X-Title"] = title

    providers.push({
      provider: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
      baseUrl: (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, ""),
      headers,
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
  policyOrder?: AiProviderName[],
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

  const modePreferredOrder: Record<NonNullable<GenerateAiTextInput["mode"]>, AiProviderName[]> = {
    essential: ["openrouter", "llama", "deepseek", "openai", "anthropic", "grok"],
    balanced: ["deepseek", "openai", "anthropic", "openrouter", "llama", "grok"],
    premium: ["openai", "anthropic", "grok", "deepseek", "openrouter", "llama"],
  }
  const mode = input.mode ?? "essential"
  for (const provider of modePreferredOrder[mode]) {
    push(provider)
  }

  for (const provider of policyOrder ?? []) {
    push(provider)
  }

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
  const maxOutputTokens = resolveMaxOutputTokens(input)
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(config.headers ?? {}),
    },
    body: JSON.stringify({
      model: input.model ?? config.model,
      temperature: input.temperature ?? 0.4,
      max_tokens: maxOutputTokens,
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
  const clampedText = clampTextToTokenBudget(text, maxOutputTokens)

  if (!clampedText) {
    throw new Error(`${config.provider} response did not include text`)
  }

  return {
    text: clampedText,
    model: input.model ?? config.model,
    provider: config.provider,
  }
}

async function generateWithAnthropic(config: ProviderConfig, input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const maxOutputTokens = resolveMaxOutputTokens(input)
  const anthropicMaxTokens = parsePositiveInt(process.env.ANTHROPIC_MAX_TOKENS) || 1024
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
    },
    body: JSON.stringify({
      model: input.model ?? config.model,
      max_tokens: Math.max(64, Math.min(maxOutputTokens, anthropicMaxTokens)),
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
  const clampedText = clampTextToTokenBudget(text, maxOutputTokens)
  if (!clampedText) {
    throw new Error("anthropic response did not include text")
  }

  return {
    text: clampedText,
    model: input.model ?? config.model,
    provider: config.provider,
  }
}

async function* generateWithOpenAiCompatibleStream(config: ProviderConfig, input: GenerateAiTextInput) {
  const maxOutputTokens = resolveMaxOutputTokens(input)
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(config.headers ?? {}),
    },
    body: JSON.stringify({
      model: input.model ?? config.model,
      temperature: input.temperature ?? 0.4,
      max_tokens: maxOutputTokens,
      stream: true,
      messages: [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.prompt },
      ],
    }),
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`${config.provider} stream error (${response.status}): ${errorText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data:")) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === "[DONE]") continue

      let payload: {
        choices?: Array<{ delta?: { content?: string } }>
      } | null = null
      try {
        payload = JSON.parse(data)
      } catch {
        payload = null
      }
      const token = payload?.choices?.[0]?.delta?.content
      if (token) {
        yield token
      }
    }
  }
}

async function* generateWithAnthropicStream(config: ProviderConfig, input: GenerateAiTextInput) {
  const maxOutputTokens = resolveMaxOutputTokens(input)
  const anthropicMaxTokens = parsePositiveInt(process.env.ANTHROPIC_MAX_TOKENS) || 1024
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
    },
    body: JSON.stringify({
      model: input.model ?? config.model,
      max_tokens: Math.max(64, Math.min(maxOutputTokens, anthropicMaxTokens)),
      temperature: input.temperature ?? 0.4,
      stream: true,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    }),
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`anthropic stream error (${response.status}): ${errorText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data:")) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === "[DONE]") continue

      try {
        const payload = JSON.parse(data) as {
          type?: string
          delta?: { text?: string }
        }
        if (payload.type === "content_block_delta" && payload.delta?.text) {
          yield payload.delta.text
        }
      } catch {
        // Ignore malformed streaming chunks.
      }
    }
  }
}

function buildLocalFallbackText(input: GenerateAiTextInput) {
  const prompt = input.prompt.trim()
  const normalized = prompt.toLowerCase()

  if (!prompt) {
    return [
      "Hey! I'm your email campaign assistant.",
      "Tell me what you want to send and who your audience is, and I'll guide you through creating and sending it.",
    ].join(" ")
  }

  if (normalized === "hi" || normalized === "hello" || normalized === "hey" || normalized.startsWith("hello ") || normalized.startsWith("hey ")) {
    return [
      "Hey! I can help you create and send email campaigns to your audience.",
      "",
      "To get started, tell me:",
      "1. What's the goal of your email? (promote a product, share news, announce an event, etc.)",
      "2. Who are you sending to? (customers, subscribers, leads, etc.)",
      "",
      "Or just describe what you need and I'll guide you through it.",
    ].join("\n")
  }

  if (normalized.includes("email") || normalized.includes("audience") || normalized.includes("csv") || normalized.includes("recipient")) {
    return [
      "Let's get your recipients set up.",
      "You can paste email addresses directly in the chat, or click + to upload a CSV file with an email column.",
      "I'll validate everything and flag any duplicates or invalid addresses before we send.",
    ].join(" ")
  }

  if (normalized.includes("template") || normalized.includes("design")) {
    return "I'll show you some template options that fit your campaign. Each one is fully customizable - you can edit text, images, colors, and layout. Let me know your goal and I'll find the best match."
  }

  if (normalized.includes("send") || normalized.includes("schedule") || normalized.includes("smtp")) {
    return [
      "When you're ready to send, you have a few options:",
      "1. Send immediately via our platform SMTP",
      "2. Connect your own SMTP server",
      "3. Use a dedicated SMTP for higher deliverability",
      "",
      "You can also schedule emails for a specific time. All emails go through our queue system with real-time progress tracking.",
    ].join("\n")
  }

  return [
    "I can help you with that! To build the best campaign, I need a few details:",
    "1. What's the goal? (promotion, newsletter, announcement, etc.)",
    "2. Who's your audience?",
    "3. What tone and call-to-action do you want?",
    "",
    "Share what you have and I'll take it from there.",
  ].join("\n")
}

export async function generateAiText(input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const maxOutputTokens = resolveMaxOutputTokens(input)
  const providerSelection = await selectProvidersForInput(input)
  if (providerSelection.fallbackText !== null) {
    const fallbackText = clampTextToTokenBudget(providerSelection.fallbackText, maxOutputTokens)
    return {
      text: fallbackText,
      model: "blastermailer-local-fallback-v1",
      provider: "fallback",
      latencyMs: 0,
      tokenIn: estimateTokens(input.prompt + (input.system ?? "")),
      tokenOut: estimateTokens(fallbackText),
      estimatedCostUsd: 0,
      attempts: [
        {
          provider: "fallback",
          model: "blastermailer-local-fallback-v1",
          status: "SUCCESS",
          latencyMs: 0,
          tokenIn: estimateTokens(input.prompt + (input.system ?? "")),
          tokenOut: estimateTokens(fallbackText),
          estimatedCostUsd: 0,
          errorCode: null,
        },
      ],
    }
  }

  const activeSelection = providerSelection as ProviderSelectionActive
  const { providerByName, attemptOrder, onboardingPool, caps, day, perUserLimit } = activeSelection
  const attemptTelemetry: GenerateAiProviderAttempt[] = []
  const errors: string[] = []

  for (const providerName of attemptOrder) {
    const config = providerByName.get(providerName)
    if (!config) continue

    const startedAt = Date.now()
    try {
      let result: GenerateAiTextResult
      if (config.provider === "anthropic") {
        result = await generateWithAnthropic(config, input)
      } else {
        result = await generateWithOpenAiCompatible(config, input)
      }

      const latencyMs = Date.now() - startedAt
      const tokenIn = estimateTokens(input.prompt + (input.system ?? ""))
      const tokenOut = estimateTokens(result.text)
      const estimatedCost = estimateCostUsd(config.provider, tokenIn, tokenOut)

      attemptTelemetry.push({
        provider: config.provider,
        model: result.model,
        status: "SUCCESS",
        latencyMs,
        tokenIn,
        tokenOut,
        estimatedCostUsd: estimatedCost,
        errorCode: null,
      })

      if (onboardingPool) {
        if (caps[config.provider] > 0) {
          await bumpDailyUsage(day, config.provider)
        }
        if (perUserLimit > 0 && input.userId) {
          await bumpUserDailyUsage(day, input.userId)
        }
      }

      return {
        ...result,
        latencyMs,
        tokenIn,
        tokenOut,
        estimatedCostUsd: estimatedCost,
        attempts: attemptTelemetry,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error"
      const latencyMs = Date.now() - startedAt
      attemptTelemetry.push({
        provider: config.provider,
        model: input.model ?? config.model,
        status: "ERROR",
        latencyMs,
        tokenIn: estimateTokens(input.prompt + (input.system ?? "")),
        tokenOut: 0,
        estimatedCostUsd: null,
        errorCode: normalizeErrorCode(message),
      })
      errors.push(`${providerName}: ${message}`)
    }
  }

  const error = new Error(`All AI providers failed. ${errors.join(" | ")}`) as Error & {
    attempts?: GenerateAiProviderAttempt[]
  }
  error.attempts = attemptTelemetry
  throw error
}

async function selectProvidersForInput(input: GenerateAiTextInput): Promise<ProviderSelectionFallback | ProviderSelectionActive> {
  const providers = buildProviderConfigs()
  if (providers.length === 0) {
    const fallbackEnabled = (process.env.AI_LOCAL_FALLBACK_ENABLED ?? "true").trim().toLowerCase()
    if (fallbackEnabled === "false" || fallbackEnabled === "0" || fallbackEnabled === "no") {
      throw new Error(
        "No AI provider API key configured. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, GROK_API_KEY, LLAMA_API_KEY, OPENROUTER_API_KEY.",
      )
    }
    return {
      fallbackText: buildLocalFallbackText(input),
    } satisfies ProviderSelectionFallback
  }

  const policy = resolveProviderPolicy({ userPlan: input.userPlan })
  const allowedByPlan = filterAllowedProviders(
    providers.map((provider) => provider.provider as PolicyProviderName),
    policy,
  ) as AiProviderName[]
  const filteredProviders = providers.filter((provider) => allowedByPlan.includes(provider.provider))
  if (filteredProviders.length === 0) {
    throw new Error("No AI providers are allowed for the current plan.")
  }

  const providerByName = new Map(filteredProviders.map((provider) => [provider.provider, provider] as const))
  const caps = getDailyCaps()
  const day = utcDayKey()
  const onboardingPool = shouldUseOnboardingPool(input.userPlan)
  const hasCaps = hasAnyDailyCap(caps)
  const usage = onboardingPool
    ? await getDailyUsage(day, filteredProviders.map((provider) => provider.provider))
    : emptyUsageCounters()
  const freeWeights = getFreeWeights()

  if (onboardingPool && !hasCaps && shouldRequireOnboardingCaps()) {
    throw new Error("Free onboarding AI is enabled, but no daily provider caps are configured.")
  }

  const onboardingCandidates = onboardingPool
    ? filteredProviders
        .map((provider) => provider.provider)
        .filter((provider) => (!hasCaps ? true : caps[provider] > 0 && (usage[provider] ?? 0) < caps[provider]))
    : filteredProviders.map((provider) => provider.provider)

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
  const attemptOrder = buildAttemptOrder(
    filteredProviders,
    input,
    selectedOnboardingProvider,
    policy.preferredOrder as AiProviderName[],
    onboardingPool ? new Set(onboardingCandidates) : undefined,
  )

  if (!attemptOrder.length) {
    throw new Error("No eligible AI provider available for this request.")
  }

  return {
    fallbackText: null,
    providers: filteredProviders,
    providerByName,
    attemptOrder,
    onboardingPool,
    caps,
    day,
    perUserLimit,
  } satisfies ProviderSelectionActive
}

export async function* generateAiTextStream(input: GenerateAiTextInput): AsyncGenerator<GenerateAiTextStreamChunk> {
  const maxOutputTokens = resolveMaxOutputTokens(input)
  const providerSelection = await selectProvidersForInput(input)
  if (providerSelection.fallbackText !== null) {
    const fallbackText = clampTextToTokenBudget(providerSelection.fallbackText, maxOutputTokens)
    const attempts: GenerateAiProviderAttempt[] = [
      {
        provider: "fallback",
        model: "blastermailer-local-fallback-v1",
        status: "SUCCESS",
        latencyMs: 0,
        tokenIn: estimateTokens(input.prompt + (input.system ?? "")),
        tokenOut: estimateTokens(fallbackText),
        estimatedCostUsd: 0,
        errorCode: null,
      },
    ]
    for (const chunk of fallbackText.match(/.{1,16}/g) ?? []) {
      yield { type: "token", token: chunk }
    }
    yield {
      type: "done",
      text: fallbackText,
      model: "blastermailer-local-fallback-v1",
      provider: "fallback",
      attempts,
    }
    return
  }

  const activeSelection = providerSelection as ProviderSelectionActive
  const { providerByName, attemptOrder, onboardingPool, caps, day, perUserLimit } = activeSelection
  const attemptTelemetry: GenerateAiProviderAttempt[] = []
  const errors: string[] = []

  for (const providerName of attemptOrder) {
    const config = providerByName.get(providerName)
    if (!config) continue

    const startedAt = Date.now()
    let fullText = ""

    try {
      const stream =
        config.provider === "anthropic"
          ? generateWithAnthropicStream(config, input)
          : generateWithOpenAiCompatibleStream(config, input)

      for await (const token of stream) {
        fullText += token
        yield { type: "token", token }
        if (estimateTokens(fullText) >= maxOutputTokens) break
      }

      if (!fullText.trim()) {
        throw new Error(`${config.provider} stream returned empty text`)
      }

      fullText = clampTextToTokenBudget(fullText, maxOutputTokens)

      const latencyMs = Date.now() - startedAt
      const tokenIn = estimateTokens(input.prompt + (input.system ?? ""))
      const tokenOut = estimateTokens(fullText)
      const estimatedCost = estimateCostUsd(config.provider, tokenIn, tokenOut)

      attemptTelemetry.push({
        provider: config.provider,
        model: input.model ?? config.model,
        status: "SUCCESS",
        latencyMs,
        tokenIn,
        tokenOut,
        estimatedCostUsd: estimatedCost,
        errorCode: null,
      })

      if (onboardingPool) {
        if (caps[config.provider] > 0) await bumpDailyUsage(day, config.provider)
        if (perUserLimit > 0 && input.userId) await bumpUserDailyUsage(day, input.userId)
      }

      yield {
        type: "done",
        text: fullText.trim(),
        model: input.model ?? config.model,
        provider: config.provider,
        attempts: attemptTelemetry,
      }
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider stream error"
      const latencyMs = Date.now() - startedAt
      attemptTelemetry.push({
        provider: config.provider,
        model: input.model ?? config.model,
        status: "ERROR",
        latencyMs,
        tokenIn: estimateTokens(input.prompt + (input.system ?? "")),
        tokenOut: 0,
        estimatedCostUsd: null,
        errorCode: normalizeErrorCode(message),
      })
      errors.push(`${providerName}: ${message}`)
    }
  }

  const fallback = await generateAiText(input)
  const combinedAttempts = [...attemptTelemetry, ...(fallback.attempts ?? [])]
  for (const token of fallback.text.match(/.{1,16}/g) ?? []) {
    yield { type: "token", token }
  }
  yield {
    type: "done",
    text: fallback.text,
    model: fallback.model,
    provider: fallback.provider,
    attempts: combinedAttempts,
  }

  if (errors.length) {
    // Preserve errors for debugging in server logs while returning fallback text.
    console.warn(`[ai-stream] fallback after stream failures: ${errors.join(" | ")}`)
  }
}
