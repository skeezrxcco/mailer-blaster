import { prisma } from "@/lib/prisma"
import { assertMinimumCredits, consumeAiCredits, estimateCreditCost } from "@/lib/ai/credits"
import { resolveAiModelProfile, type AiModelMode } from "@/lib/ai/model-mode"
import { generateAiText, generateAiTextStream, type GenerateAiTextInput, type GenerateAiTextResult } from "@/lib/ai"
import { moderatePrompt } from "@/lib/ai/moderation"
import { executeTool } from "@/lib/ai/tools"
import type { AiStreamEvent, AiWorkflowIntent, AiWorkflowState, ToolName, ToolResultPayload } from "@/lib/ai/types"
import { applyWorkflowPatch, type WorkflowMachineState } from "@/lib/ai/workflow-machine"
import { loadOrCreateWorkflowSession, persistWorkflowState } from "@/lib/ai/workflow-store"
import { templateOptions } from "@/components/shared/newsletter/template-data"

type OrchestratorInput = {
  userId: string
  userPlan?: string
  prompt: string
  conversationId?: string | null
  mode?: AiModelMode
  model?: string
  provider?: string
  system?: string
}

type PlannerDecision = {
  tool: ToolName
  args?: Record<string, unknown>
  state?: AiWorkflowState
  intent?: AiWorkflowIntent
  response?: string
}

function safeJsonParse<T>(raw: string): T | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  const candidate = trimmed.slice(start, end + 1)

  try {
    return JSON.parse(candidate) as T
  } catch {
    return null
  }
}

function normalizeTool(value: string | undefined): ToolName {
  const candidate = String(value ?? "")
    .trim()
    .toLowerCase()
  if (candidate === "ask_campaign_type") return "ask_campaign_type"
  if (candidate === "suggest_templates") return "suggest_templates"
  if (candidate === "select_template") return "select_template"
  if (candidate === "request_recipients") return "request_recipients"
  if (candidate === "validate_recipients") return "validate_recipients"
  if (candidate === "review_campaign") return "review_campaign"
  if (candidate === "confirm_queue_campaign") return "confirm_queue_campaign"
  if (candidate === "compose_signature_email") return "compose_signature_email"
  return "compose_simple_email"
}

function inferFallbackDecision(state: WorkflowMachineState, prompt: string): PlannerDecision {
  const normalized = prompt.toLowerCase()
  const matchedTemplate = templateOptions.find((template) => normalized.includes(template.id))
  if (matchedTemplate) {
    return {
      tool: "select_template",
      args: { templateId: matchedTemplate.id },
      state: "TEMPLATE_SELECTED",
      intent: state.intent === "UNKNOWN" ? "NEWSLETTER" : state.intent,
      response: `Great choice! I've selected ${matchedTemplate.name} for you. You can preview and customize it, then we'll collect your recipients.`,
    }
  }

  if (normalized.includes("@") || normalized.includes("csv")) {
    return {
      tool: "validate_recipients",
      args: { recipients: prompt },
      state: "VALIDATION_REVIEW",
      response: "Let me validate those email addresses for you. I'll check for formatting issues and duplicates.",
    }
  }

  if (normalized.includes("send") || normalized.includes("launch") || normalized.includes("queue")) {
    return {
      tool: "confirm_queue_campaign",
      state: "QUEUED",
      response: "Queuing your campaign now! Emails will be sent through our delivery system with real-time progress tracking.",
    }
  }

  const emailIntentKeywords = [
    "newsletter", "template", "email", "campaign", "promo", "promotion",
    "announcement", "welcome", "onboarding", "launch", "update", "invite",
    "reminder", "follow-up", "followup", "drip", "blast", "outreach",
    "retention", "reactivation", "winback", "win-back", "upsell",
    "cross-sell", "product update", "event", "webinar", "sale",
  ]
  const hasEmailIntent = emailIntentKeywords.some((kw) => normalized.includes(kw))

  if (hasEmailIntent && (state.state === "INTENT_CAPTURE" || state.state === "GOAL_BRIEF")) {
    return {
      tool: "suggest_templates",
      args: { query: prompt },
      state: "TEMPLATE_DISCOVERY",
      intent: "NEWSLETTER",
      response: "I found some templates that match what you're going for. Pick the one that fits best — each is fully customizable, and I'll help you refine the content.",
    }
  }

  if (state.state === "INTENT_CAPTURE" || state.state === "GOAL_BRIEF") {
    return {
      tool: "ask_campaign_type",
      args: { query: prompt },
      state: "GOAL_BRIEF",
      intent: state.intent === "UNKNOWN" ? "UNKNOWN" : state.intent,
      response: [
        "Thanks for sharing that! To create the best campaign for you, I'd like to know a bit more:",
        "",
        "1. What type of email is this? (newsletter, promotion, announcement, etc.)",
        "2. Who's your target audience?",
        "3. What action do you want readers to take?",
        "",
        "Share whatever you have and I'll take it from there.",
      ].join("\n"),
    }
  }

  if (normalized.includes("signature")) {
    return {
      tool: "compose_signature_email",
      state: "COMPLETED",
      intent: "SIGNATURE",
      response: "I can create a polished signature email for you. Tell me the recipient, the tone you want, and your main call-to-action.",
    }
  }

  return {
    tool: "ask_campaign_type",
    state: "GOAL_BRIEF",
    intent: state.intent === "UNKNOWN" ? "UNKNOWN" : state.intent,
    response: [
      "I'd love to help with that! I specialize in email campaigns — here's what I can do:",
      "",
      "1. Create and send newsletters with professional templates",
      "2. Build promotional or announcement emails",
      "3. Draft signature emails",
      "",
      "What kind of email would you like to create? Tell me your goal and audience and I'll get you started.",
    ].join("\n"),
  }
}

function looksLikeGreetingOrShortIntent(prompt: string) {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return true
  const greetings = new Set([
    "hi",
    "hello",
    "hey",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
  ])
  if (greetings.has(normalized)) return true
  if (normalized === "help" || normalized === "start") return true
  if (normalized.startsWith("can you help")) return true
  if (normalized.startsWith("i need help")) return true
  return false
}

function isLikelyIncoherentPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return false
  if (looksLikeGreetingOrShortIntent(normalized)) return false

  const compact = normalized.replace(/\s+/g, "")
  if (compact.length <= 2) return true
  if (!/[a-z]/.test(compact)) return true

  const vowelCount = (compact.match(/[aeiou]/g) ?? []).length
  const uniqueChars = new Set(compact).size
  const singleToken = normalized.split(/\s+/).filter(Boolean).length === 1

  if (singleToken && compact.length <= 5 && vowelCount === 0) return true
  if (singleToken && compact.length >= 4 && uniqueChars <= 2) return true
  if (/^[a-z]{3,6}$/.test(compact) && vowelCount === 0) return true

  return false
}

function buildIncoherentPromptResponse(turn: number) {
  if (turn <= 1) {
    return "I didn’t catch that. Tell me in one line what you want to send and what outcome you want."
  }
  return "I still can’t understand that input. Rephrase it as: campaign type + audience + goal."
}

function shouldCaptureGoalPrompt(prompt: string) {
  const normalized = prompt.trim()
  if (!normalized) return false
  if (looksLikeGreetingOrShortIntent(normalized)) return false
  if (isLikelyIncoherentPrompt(normalized)) return false
  return normalized.length >= 6
}

function buildPlannerPrompt(state: WorkflowMachineState, prompt: string) {
  const context = {
    state: state.state,
    intent: state.intent,
    selectedTemplateId: state.selectedTemplateId,
    recipientStats: state.recipientStats,
    context: state.context,
  }

  return [
    "You are the AI planner for Blastermailer, an email campaign platform.",
    "Select exactly one tool and respond with strict JSON only.",
    "",
    "JSON Schema:",
    '{"tool":"<tool_name>","args":{},"state":"<next_state>","intent":"<intent>","response":"<your conversational response to the user>"}',
    "",
    "Tools: ask_campaign_type | suggest_templates | select_template | request_recipients | validate_recipients | review_campaign | confirm_queue_campaign | compose_simple_email | compose_signature_email",
    "States: INTENT_CAPTURE | GOAL_BRIEF | TEMPLATE_DISCOVERY | TEMPLATE_SELECTED | CONTENT_REFINE | AUDIENCE_COLLECTION | VALIDATION_REVIEW | SEND_CONFIRMATION | QUEUED | COMPLETED",
    "Intents: UNKNOWN | NEWSLETTER | SIMPLE_EMAIL | SIGNATURE",
    "",
    "## Conversation Strategy",
    "You are a friendly, knowledgeable email marketing assistant. Your job is to INTERACT with the user naturally while guiding them through this flow:",
    "1. Understand their overall goal (what they want to achieve with email)",
    "2. Propose a template if they haven't specified one",
    "3. Help them collect/import their mailing list",
    "4. Send or schedule the email campaign",
    "",
    "## Response Style Rules",
    "- BE CONVERSATIONAL. Respond naturally to what the user says. Acknowledge their input, ask follow-up questions, offer suggestions.",
    "- When the user describes their business or goal, engage with it. Ask clarifying questions about their audience, tone, and objectives.",
    "- Use short paragraphs and numbered lists for readability. Keep responses 2-4 sentences unless detail is needed.",
    "- NEVER ignore the user's message. Always address what they said before moving to next steps.",
    "- If the user asks a question about email marketing, answer it helpfully, then guide back to the workflow.",
    "- If the user's message isn't directly about email, acknowledge it warmly and steer toward how you can help with their email needs.",
    "- Never use formal letter format, greetings like 'Dear user', or signatures.",
    "- Never prefix with labels like 'Resumed:' or 'Response:'.",
    "",
    "## Tool Selection Guide",
    "- PROACTIVE TEMPLATES: As soon as the user mentions ANY email-related intent (welcome email, promo, newsletter, announcement, product update, etc.), use suggest_templates IMMEDIATELY. Do NOT ask clarifying questions first — show templates and refine from there.",
    "- INTENT_CAPTURE/GOAL_BRIEF: If the user's intent is unclear or not email-related, use ask_campaign_type to learn more.",
    "- Once templates are shown: User picks a template → use select_template with the templateId.",
    "- Template confirmed: Use request_recipients to ask for their mailing list.",
    "- User provides emails: Use validate_recipients to validate them.",
    "- Ready to send: Use review_campaign, then confirm_queue_campaign.",
    "- Simple one-off email (no template needed): Use compose_simple_email.",
    "- Email signature request: Use compose_signature_email.",
    "",
    "## SMTP and Sending Options",
    "When discussing sending, the user can choose:",
    "- Platform SMTP (default, included)",
    "- Their own SMTP server (custom configuration)",
    "- Purchase dedicated SMTP through the platform",
    "Mention these options when relevant, especially at the send/schedule step.",
    "",
    `Current workflow state: ${JSON.stringify(context)}`,
    `User message: ${prompt}`,
  ].join("\n")
}

function mapToolToPatch(
  decision: PlannerDecision,
  current: WorkflowMachineState,
  result: ToolResultPayload,
): Partial<WorkflowMachineState> {
  const patch: Partial<WorkflowMachineState> = {}

  if (decision.state) patch.state = decision.state
  if (decision.intent) patch.intent = decision.intent
  if (result.selectedTemplateId) patch.selectedTemplateId = result.selectedTemplateId
  if (result.recipientStats) patch.recipientStats = result.recipientStats

  if (decision.tool === "request_recipients" && !patch.state) patch.state = "AUDIENCE_COLLECTION"
  if (decision.tool === "review_campaign" && !patch.state) patch.state = "SEND_CONFIRMATION"
  if (decision.tool === "confirm_queue_campaign" && !patch.state) patch.state = "QUEUED"
  if (decision.tool === "suggest_templates" && !patch.state) patch.state = "TEMPLATE_DISCOVERY"
  if (decision.tool === "select_template" && !patch.state) patch.state = "TEMPLATE_SELECTED"

  if (!patch.intent && current.intent === "UNKNOWN" && decision.tool === "suggest_templates") {
    patch.intent = "NEWSLETTER"
  }

  return patch
}

function getErrorCode(message: string) {
  if (message.includes("429")) return "RATE_LIMIT"
  if (message.includes("503")) return "SERVICE_UNAVAILABLE"
  if (message.toLowerCase().includes("quota")) return "QUOTA_EXCEEDED"
  return "UNKNOWN"
}

async function persistTelemetry(input: {
  requestId: string
  sessionId: string
  userId: string
  moderationAction: string
  result: GenerateAiTextResult | null
  error?: string
}) {
  if (!input.result && !input.error) return

  const attempts = input.result?.attempts?.length
    ? input.result.attempts
    : [
        {
          provider: input.result?.provider ?? "unknown",
          model: input.result?.model ?? "unknown",
          status: input.error ? "ERROR" : "SUCCESS",
          latencyMs: input.result?.latencyMs ?? null,
          tokenIn: input.result?.tokenIn ?? null,
          tokenOut: input.result?.tokenOut ?? null,
          estimatedCostUsd: input.result?.estimatedCostUsd ?? null,
          errorCode: input.error ? getErrorCode(input.error) : null,
        },
      ]

  await prisma.aiRequestTelemetry.createMany({
    data: attempts.map((attempt) => ({
      requestId: input.requestId,
      sessionId: input.sessionId,
      userId: input.userId,
      provider: attempt.provider,
      model: attempt.model,
      latencyMs: attempt.latencyMs ?? null,
      tokenIn: attempt.tokenIn ?? null,
      tokenOut: attempt.tokenOut ?? null,
      estimatedCostUsd: attempt.estimatedCostUsd ?? null,
      status: attempt.status,
      errorCode: attempt.errorCode ?? null,
      moderationAction: input.moderationAction,
    })),
  })
}

async function runPlannerAi(input: GenerateAiTextInput, state: WorkflowMachineState, prompt: string) {
  const planner = await generateAiText({
    ...input,
    temperature: 0.3,
    maxOutputTokens: 400,
    prompt: buildPlannerPrompt(state, prompt),
    system: [
      "You are the AI workflow planner for Blastermailer, an email campaign platform.",
      "You MUST output valid JSON only. No markdown, no explanation, just the JSON object.",
      "Your response field should be a warm, helpful, conversational message to the user.",
      "Always acknowledge what the user said and connect it to the email workflow.",
      "Be specific and actionable. Reference the user's business, goals, or audience when known.",
    ].join("\n"),
  })
  const parsed = safeJsonParse<PlannerDecision>(planner.text)
  if (!parsed) return { decision: inferFallbackDecision(state, prompt), planner }

  return {
    decision: {
      ...parsed,
      tool: normalizeTool(parsed.tool),
      args: parsed.args ?? {},
      state: parsed.state,
      intent: parsed.intent,
      response: parsed.response,
    } as PlannerDecision,
    planner,
  }
}

function chunkText(text: string) {
  return text.match(/.{1,20}/g) ?? [text]
}

export async function* orchestrateAiChatStream(input: OrchestratorInput): AsyncGenerator<AiStreamEvent> {
  const requestId = crypto.randomUUID()
  const moderation = moderatePrompt(input.prompt)
  const modelProfile = resolveAiModelProfile({
    mode: input.mode,
    userPlan: input.userPlan,
  })
  const workflowSession = await loadOrCreateWorkflowSession({
    userId: input.userId,
    conversationId: input.conversationId ?? null,
  })

  yield {
    type: "session",
    requestId,
    conversationId: workflowSession.conversationId,
    state: workflowSession.state.state,
    intent: workflowSession.state.intent,
    resumed: workflowSession.resumed,
  }

  if (moderation.action === "rewrite_safety") {
    yield {
      type: "moderation",
      action: moderation.action,
      message: moderation.message,
    }
  }

  const aiInputBase: GenerateAiTextInput = {
    prompt: moderation.sanitizedPrompt,
    mode: modelProfile.mode,
    model: modelProfile.model ?? input.model,
    provider: modelProfile.provider ?? input.provider,
    system: [input.system, modelProfile.qualityInstruction].filter(Boolean).join("\n"),
    userId: input.userId,
    userPlan: input.userPlan,
    temperature: modelProfile.temperature,
    maxOutputTokens: modelProfile.maxOutputTokens,
  }

  const estimatedMinimumCredits = estimateCreditCost({
    prompt: moderation.sanitizedPrompt,
    mode: modelProfile.mode,
  })
  const creditsSnapshot = await assertMinimumCredits({
    userId: input.userId,
    userPlan: input.userPlan,
    minimumCredits: estimatedMinimumCredits,
  })

  const previousIncoherentTurns = Number.isFinite(workflowSession.state.context.incoherentTurns)
    ? Math.max(0, workflowSession.state.context.incoherentTurns ?? 0)
    : 0
  const incoherentPrompt = isLikelyIncoherentPrompt(moderation.sanitizedPrompt)
  const nextIncoherentTurns = incoherentPrompt ? Math.min(previousIncoherentTurns + 1, 3) : 0

  let plannerResult: GenerateAiTextResult | null = null
  let decision: PlannerDecision
  if (incoherentPrompt) {
    decision = {
      tool: "ask_campaign_type",
      state: "GOAL_BRIEF",
      intent: workflowSession.state.intent === "UNKNOWN" ? "UNKNOWN" : workflowSession.state.intent,
      response: buildIncoherentPromptResponse(nextIncoherentTurns),
    }
  } else if (workflowSession.state.state === "INTENT_CAPTURE" && looksLikeGreetingOrShortIntent(moderation.sanitizedPrompt)) {
    decision = {
      tool: "ask_campaign_type",
      state: "GOAL_BRIEF",
      intent: workflowSession.state.intent === "UNKNOWN" ? "UNKNOWN" : workflowSession.state.intent,
      response: [
        "Hey! I'm your email campaign assistant. I can help you create and send professional emails to your audience.",
        "",
        "To get started, tell me:",
        "1. What's the goal of your email? (promote a product, share news, announce an event, etc.)",
        "2. Who are you sending to? (customers, subscribers, leads, etc.)",
        "",
        "Or just describe what you need and I'll guide you through it.",
      ].join("\n"),
    }
  } else {
    try {
      const plannerOutput = await runPlannerAi(aiInputBase, workflowSession.state, moderation.sanitizedPrompt)
      plannerResult = plannerOutput.planner
      decision = plannerOutput.decision
    } catch {
      decision = inferFallbackDecision(workflowSession.state, moderation.sanitizedPrompt)
    }
  }

  const tool = normalizeTool(decision.tool)
  const args = decision.args ?? {}
  yield {
    type: "tool_start",
    tool,
    args,
  }

  const toolResult = executeTool({
    tool,
    args,
    context: workflowSession.state.context,
    selectedTemplateId: workflowSession.state.selectedTemplateId,
    userPlan: input.userPlan,
  })

  yield {
    type: "tool_result",
    tool,
    result: toolResult,
  }

  const toolPatch = mapToolToPatch(decision, workflowSession.state, toolResult)
  const contextPatch: WorkflowMachineState["context"] = {
    incoherentTurns: nextIncoherentTurns,
  }
  if (shouldCaptureGoalPrompt(moderation.sanitizedPrompt) && !workflowSession.state.context.goal) {
    contextPatch.goal = moderation.sanitizedPrompt
  }

  const patched = applyWorkflowPatch(workflowSession.state, {
    state: toolPatch.state ?? decision.state,
    intent: toolPatch.intent ?? decision.intent,
    selectedTemplateId: toolResult.selectedTemplateId ?? workflowSession.state.selectedTemplateId,
    recipientStats: toolResult.recipientStats ?? workflowSession.state.recipientStats,
    summary: toolResult.text ?? workflowSession.state.summary,
    context: contextPatch,
  })

  const persisted = await persistWorkflowState({
    sessionId: workflowSession.id,
    state: patched,
    checkpointPayload: {
      tool,
      args,
      toolResult,
    },
  })

  yield {
    type: "state_patch",
    state: persisted.state.state,
    intent: persisted.state.intent,
    selectedTemplateId: persisted.state.selectedTemplateId,
    recipientStats: persisted.state.recipientStats,
  }

  const shouldUseToolTextOnly = [
    "ask_campaign_type",
    "suggest_templates",
    "request_recipients",
    "validate_recipients",
    "confirm_queue_campaign",
  ].includes(tool)

  let responseResult: GenerateAiTextResult | null = null
  let finalText = decision.response?.trim() || ""

  if (shouldUseToolTextOnly) {
    if (!finalText) {
      finalText = toolResult.text ?? "Done."
    }
    for (const token of chunkText(finalText)) {
      yield { type: "token", token }
    }
  } else {
    try {
      let streamedText = ""
      for await (const chunk of generateAiTextStream({
        ...aiInputBase,
        system: [
          "You are Blastermailer AI, a friendly and knowledgeable email campaign assistant.",
          "You help users create, design, and send email campaigns.",
          "Be conversational, warm, and specific. Reference the user's actual message.",
          "Keep responses concise (2-5 sentences) unless the user needs more detail.",
          "Always guide toward the email workflow: goal → template → recipients → send.",
          "Never use formal letter format. No 'Dear user' or sign-offs.",
          "When discussing sending options, mention: platform SMTP (default), custom SMTP, or dedicated SMTP.",
          "For scheduling, emails can be sent immediately or scheduled for a specific time.",
          "Emails are sent via a queue system that handles multi-recipient delivery with progress tracking.",
        ].join("\n"),
        prompt: [
          `The user said: "${moderation.sanitizedPrompt}"`,
          "",
          `Current workflow state: ${persisted.state.state}`,
          `User's goal: ${persisted.state.context.goal ?? "not yet defined"}`,
          `Selected template: ${persisted.state.selectedTemplateId ?? "none"}`,
          `Recipients: ${persisted.state.recipientStats ? `${persisted.state.recipientStats.valid} valid of ${persisted.state.recipientStats.total} total` : "none yet"}`,
          "",
          `Tool used: ${tool}`,
          `Tool output: ${JSON.stringify(toolResult)}`,
          "",
          "Write a natural, helpful response that:",
          "1. Directly addresses what the user said",
          "2. Incorporates the tool result naturally",
          "3. Suggests the clear next step in the workflow",
        ].join("\n"),
      })) {
        if (chunk.type === "token") {
          streamedText += chunk.token
          yield { type: "token", token: chunk.token }
          continue
        }
        responseResult = {
          text: chunk.text,
          model: chunk.model,
          provider: chunk.provider,
          attempts: chunk.attempts,
          tokenIn: null,
          tokenOut: null,
          latencyMs: null,
          estimatedCostUsd: null,
        }
      }

      if (streamedText.trim()) {
        finalText = streamedText.trim()
      } else if (responseResult?.text) {
        finalText = responseResult.text
      }
    } catch {
      responseResult = await generateAiText({
        ...aiInputBase,
        system: [
          "You are Blastermailer AI, a friendly email campaign assistant.",
          "Be conversational, concise, and helpful. Reference what the user actually said.",
          "Guide toward: goal → template → recipients → send.",
          "No formal letter format. No sign-offs.",
        ].join("\n"),
        prompt: [
          `The user said: "${moderation.sanitizedPrompt}"`,
          `Workflow state: ${persisted.state.state}`,
          `Tool: ${tool}`,
          `Tool result: ${JSON.stringify(toolResult)}`,
          "Write a concise, natural response addressing the user and suggesting next steps.",
        ].join("\n"),
      })
      finalText = responseResult.text
      for (const token of chunkText(finalText)) {
        yield { type: "token", token }
      }
    }
  }

  if (!finalText) {
    finalText = toolResult.text ?? "Done."
  }

  await persistTelemetry({
    requestId,
    sessionId: persisted.id,
    userId: input.userId,
    moderationAction: moderation.action,
    result: plannerResult,
  })
  await persistTelemetry({
    requestId,
    sessionId: persisted.id,
    userId: input.userId,
    moderationAction: moderation.action,
    result: responseResult,
  })

  const totalAttempts = (plannerResult?.attempts?.length ?? 0) + (responseResult?.attempts?.length ?? 0)
  const responseCredits = estimateCreditCost({
    prompt: moderation.sanitizedPrompt,
    responseText: finalText,
    mode: modelProfile.mode,
    toolName: tool,
  })
  const creditsToCharge = Math.max(
    estimatedMinimumCredits,
    Math.min(10, responseCredits + Math.max(0, totalAttempts - 2)),
  )
  const creditCharge = await consumeAiCredits({
    userId: input.userId,
    userPlan: input.userPlan,
    credits: creditsToCharge,
    cachedSnapshot: creditsSnapshot,
  })

  yield {
    type: "done",
    requestId,
    conversationId: persisted.conversationId,
    state: persisted.state.state,
    intent: persisted.state.intent,
    text: finalText,
    selectedTemplateId: persisted.state.selectedTemplateId,
    templateSuggestions: toolResult.templateSuggestions,
    recipientStats: persisted.state.recipientStats,
    campaignId: toolResult.campaignId ?? null,
    remainingCredits: creditCharge.snapshot.remainingCredits,
    maxCredits: creditCharge.snapshot.maxCredits,
  }
}
