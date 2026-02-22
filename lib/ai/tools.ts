import { templateOptions } from "@/components/shared/newsletter/template-data"
import type { RecipientValidationStats, TemplateSuggestion, ToolResultPayload, WorkflowSessionContext } from "@/lib/ai/types"

export type ToolExecutionInput = {
  tool: string
  args: Record<string, unknown>
  context: WorkflowSessionContext
  selectedTemplateId: string | null
  userPlan?: string
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function scoreTemplate(template: (typeof templateOptions)[number], query: string) {
  const candidate = normalize(`${template.name} ${template.theme} ${template.domain} ${template.tone}`)
  const tokens = normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 2)

  return tokens.reduce((score, token) => (candidate.includes(token) ? score + 1 : score), 0)
}

function toSuggestion(template: (typeof templateOptions)[number]): TemplateSuggestion {
  return {
    id: template.id,
    name: template.name,
    theme: template.theme,
    domain: template.domain,
    tone: template.tone,
  }
}

function parseEmails(input: string) {
  const tokens = input
    .split(/[;\n,]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const valid = new Set<string>()
  let invalid = 0
  let duplicates = 0

  for (const token of tokens) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) {
      invalid += 1
      continue
    }
    if (valid.has(token)) {
      duplicates += 1
      continue
    }
    valid.add(token)
  }

  const stats: RecipientValidationStats = {
    total: tokens.length,
    valid: valid.size,
    invalid,
    duplicates,
  }

  return stats
}

export function executeTool(input: ToolExecutionInput): ToolResultPayload {
  const tool = input.tool.trim().toLowerCase()
  const normalizedPlan = String(input.userPlan ?? "")
    .trim()
    .toLowerCase()
  const isProUser = normalizedPlan === "pro" || normalizedPlan === "premium" || normalizedPlan === "enterprise"

  if (tool === "ask_campaign_type") {
    return {
      text: "Great, what are you sending today: newsletter, promo, product update, or one-off email?",
    }
  }

  if (tool === "suggest_templates") {
    const query = String(input.args.query ?? input.context.goal ?? "")
    const ranked = templateOptions
      .filter((template) => isProUser || template.accessTier !== "pro")
      .sort((a, b) => scoreTemplate(b, query) - scoreTemplate(a, query))
      .slice(0, 4)
      .map(toSuggestion)

    return {
      text: "I selected four template directions that best match your campaign.",
      templateSuggestions: ranked,
    }
  }

  if (tool === "select_template") {
    const templateId = String(input.args.templateId ?? "")
    const found = templateOptions.find((template) => template.id === templateId)
    if (!found) {
      return {
        text: "I could not find that template. Pick one of the suggestions and I will continue.",
      }
    }
    if (!isProUser && found.accessTier === "pro") {
      return {
        text: `${found.name} is a Pro template. Upgrade to Pro to use it, or choose a free template and I’ll continue.`,
      }
    }
    return {
      text: `${found.name} selected. I can now help refine content and collect recipients.`,
      selectedTemplateId: found.id,
    }
  }

  if (tool === "request_recipients") {
    return {
      text: "Please paste recipient emails or upload a CSV with an email column.",
    }
  }

  if (tool === "validate_recipients") {
    const source = String(input.args.recipients ?? "")
    const stats = parseEmails(source)
    return {
      text: `Validation complete: ${stats.valid} valid, ${stats.invalid} invalid, ${stats.duplicates} duplicates.`,
      recipientStats: stats,
    }
  }

  if (tool === "review_campaign") {
    const templateName = templateOptions.find((entry) => entry.id === input.selectedTemplateId)?.name ?? "selected template"
    return {
      text: [
        `Quick review: goal captured, ${templateName} configured, and recipients validated.`,
        "",
        "Before we send, choose your delivery method:",
        "- Platform SMTP (default, ready to go)",
        "- Your own SMTP server (custom configuration)",
        "- Dedicated SMTP (higher deliverability)",
        "",
        "You can also schedule for a specific time instead of sending immediately. Ready to confirm?",
      ].join("\n"),
    }
  }

  if (tool === "confirm_queue_campaign") {
    const campaignId = `cmp-${Date.now().toString().slice(-8)}`
    const smtpSource = String(input.args.smtpSource ?? "platform")
    const schedule = input.args.scheduledAt ? String(input.args.scheduledAt) : null
    const smtpLabel = smtpSource === "user" ? "your custom SMTP" : smtpSource === "dedicated" ? "dedicated SMTP" : "platform SMTP"
    const scheduleLabel = schedule ? `scheduled for ${schedule}` : "queued for immediate delivery"

    return {
      text: [
        `Campaign ${scheduleLabel} via ${smtpLabel} (ID: ${campaignId}).`,
        "Emails will be sent through our queue system with progress tracking.",
        "You'll receive real-time updates as each recipient is processed.",
      ].join(" "),
      campaignId,
    }
  }

  if (tool === "compose_signature_email") {
    return {
      text: "Perfect. I can draft a clean signature email. Tell me who it is for, the tone, and the CTA. You can send to multiple recipients at once.",
    }
  }

  return {
    text: "Got it. Tell me your goal, target audience, and CTA, and I'll draft it with you. We can send to your full mailing list when ready.",
  }
}
