import type { AiWorkflowIntent, AiWorkflowState, WorkflowStatePatch } from "@/lib/ai/types"

export const WORKFLOW_STATE_SEQUENCE: AiWorkflowState[] = [
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
]

export type WorkflowMachineState = {
  state: AiWorkflowState
  intent: AiWorkflowIntent
  selectedTemplateId: string | null
  recipientStats: {
    total: number
    valid: number
    invalid: number
    duplicates: number
  } | null
  summary: string | null
  context: {
    goal?: string
    audience?: string
    tone?: string
    cta?: string
    incoherentTurns?: number
  }
}

export function createInitialMachineState(): WorkflowMachineState {
  return {
    state: "INTENT_CAPTURE",
    intent: "UNKNOWN",
    selectedTemplateId: null,
    recipientStats: null,
    summary: null,
    context: {},
  }
}

function stateIndex(state: AiWorkflowState) {
  return WORKFLOW_STATE_SEQUENCE.indexOf(state)
}

function coerceState(state: string | null | undefined): AiWorkflowState {
  if (!state) return "INTENT_CAPTURE"
  const candidate = state.toUpperCase() as AiWorkflowState
  if (WORKFLOW_STATE_SEQUENCE.includes(candidate)) return candidate
  return "INTENT_CAPTURE"
}

function coerceIntent(intent: string | null | undefined): AiWorkflowIntent {
  const candidate = String(intent ?? "")
    .trim()
    .toUpperCase()
  if (candidate === "NEWSLETTER") return "NEWSLETTER"
  if (candidate === "SIMPLE_EMAIL") return "SIMPLE_EMAIL"
  if (candidate === "SIGNATURE") return "SIGNATURE"
  return "UNKNOWN"
}

export function hydrateMachineState(input: {
  state?: string | null
  intent?: string | null
  selectedTemplateId?: string | null
  recipientStats?: WorkflowMachineState["recipientStats"]
  summary?: string | null
  context?: WorkflowMachineState["context"] | null
}): WorkflowMachineState {
  return {
    state: coerceState(input.state),
    intent: coerceIntent(input.intent),
    selectedTemplateId: input.selectedTemplateId ?? null,
    recipientStats: input.recipientStats ?? null,
    summary: input.summary ?? null,
    context: input.context ?? {},
  }
}

export function applyWorkflowPatch(
  current: WorkflowMachineState,
  patch: WorkflowStatePatch,
  options?: { allowBackwardState?: boolean },
): WorkflowMachineState {
  const nextState = patch.state ? coerceState(patch.state) : current.state
  const resolvedState =
    options?.allowBackwardState || stateIndex(nextState) >= stateIndex(current.state) ? nextState : current.state

  return {
    state: resolvedState,
    intent: patch.intent ? coerceIntent(patch.intent) : current.intent,
    selectedTemplateId:
      patch.selectedTemplateId !== undefined ? patch.selectedTemplateId : current.selectedTemplateId,
    recipientStats: patch.recipientStats !== undefined ? patch.recipientStats : current.recipientStats,
    summary: patch.summary !== undefined ? patch.summary : current.summary,
    context: {
      ...current.context,
      ...(patch.context ?? {}),
    },
  }
}
