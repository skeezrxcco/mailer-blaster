export const AI_WORKFLOW_STATES = [
  "INTENT_CAPTURE",
  "GOAL_BRIEF",
  "TEMPLATE_DISCOVERY",
  "TEMPLATE_SELECTED",
  "CONTENT_REFINE",
  "AUDIENCE_COLLECTION",
  "VALIDATION_REVIEW",
  "SEND_CONFIRMATION",
  "QUEUED",
  "COMPLETED",
] as const

export type AiWorkflowState = (typeof AI_WORKFLOW_STATES)[number]

export const AI_WORKFLOW_INTENTS = ["UNKNOWN", "NEWSLETTER", "SIMPLE_EMAIL", "SIGNATURE"] as const
export type AiWorkflowIntent = (typeof AI_WORKFLOW_INTENTS)[number]

export type RecipientValidationStats = {
  total: number
  valid: number
  invalid: number
  duplicates: number
}

export type TemplateSuggestion = {
  id: string
  name: string
  theme: string
  domain: string
  tone: string
}

export type WorkflowSessionContext = {
  goal?: string
  audience?: string
  tone?: string
  cta?: string
  incoherentTurns?: number
}

export type WorkflowStatePatch = {
  state?: AiWorkflowState
  intent?: AiWorkflowIntent
  selectedTemplateId?: string | null
  recipientStats?: RecipientValidationStats | null
  summary?: string | null
  context?: WorkflowSessionContext
}

export type ToolName =
  | "ask_campaign_type"
  | "suggest_templates"
  | "select_template"
  | "request_recipients"
  | "validate_recipients"
  | "review_campaign"
  | "confirm_queue_campaign"
  | "compose_simple_email"
  | "compose_signature_email"

export type ToolResultPayload = {
  text?: string
  templateSuggestions?: TemplateSuggestion[]
  selectedTemplateId?: string
  recipientStats?: RecipientValidationStats
  campaignId?: string
}

export type AiStreamEvent =
  | {
      type: "session"
      requestId: string
      conversationId: string
      state: AiWorkflowState
      intent: AiWorkflowIntent
      resumed: boolean
    }
  | {
      type: "moderation"
      action: "allow" | "rewrite_scope" | "rewrite_safety"
      message: string
    }
  | {
      type: "tool_start"
      tool: ToolName
      args?: Record<string, unknown>
    }
  | {
      type: "tool_result"
      tool: ToolName
      result: ToolResultPayload
    }
  | {
      type: "state_patch"
      state: AiWorkflowState
      intent: AiWorkflowIntent
      selectedTemplateId?: string | null
      recipientStats?: RecipientValidationStats | null
    }
  | {
      type: "token"
      token: string
    }
  | {
      type: "done"
      requestId: string
      conversationId: string
      state: AiWorkflowState
      intent: AiWorkflowIntent
      text: string
      selectedTemplateId?: string | null
      templateSuggestions?: TemplateSuggestion[]
      recipientStats?: RecipientValidationStats | null
      campaignId?: string | null
      remainingCredits?: number | null
      maxCredits?: number | null
    }
  | {
      type: "error"
      error: string
    }
