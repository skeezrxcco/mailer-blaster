import type { AiWorkflowState, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { createConversationId } from "@/lib/ai-chat-orchestration"
import { createInitialMachineState, hydrateMachineState, type WorkflowMachineState } from "@/lib/ai/workflow-machine"

const DEFAULT_RESUME_DAYS = 30

function getResumeDays() {
  const configured = Number.parseInt(process.env.AI_WORKFLOW_RESUME_DAYS ?? "", 10)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_RESUME_DAYS
}

function buildDefaultExpiry() {
  const now = new Date()
  now.setDate(now.getDate() + getResumeDays())
  return now
}

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  return value as Prisma.InputJsonValue
}

export type WorkflowSessionEntity = {
  id: string
  userId: string
  conversationId: string
  state: WorkflowMachineState
  expiresAt: Date
  lastActivityAt: Date
  resumed: boolean
}

function mapSessionEntity(
  raw: {
    id: string
    userId: string
    conversationId: string
    state: AiWorkflowState
    intent: string
    selectedTemplateId: string | null
    recipientStats: unknown
    summary: string | null
    contextJson: unknown
    expiresAt: Date
    lastActivityAt: Date
  },
  resumed: boolean,
): WorkflowSessionEntity {
  return {
    id: raw.id,
    userId: raw.userId,
    conversationId: raw.conversationId,
    state: hydrateMachineState({
      state: raw.state,
      intent: raw.intent,
      selectedTemplateId: raw.selectedTemplateId,
      recipientStats: raw.recipientStats as WorkflowMachineState["recipientStats"],
      summary: raw.summary,
      context: (raw.contextJson as WorkflowMachineState["context"] | null) ?? {},
    }),
    expiresAt: raw.expiresAt,
    lastActivityAt: raw.lastActivityAt,
    resumed,
  }
}

export async function loadOrCreateWorkflowSession(input: {
  userId: string
  conversationId?: string | null
}): Promise<WorkflowSessionEntity> {
  const now = new Date()

  const findWhere: Prisma.AiWorkflowSessionWhereInput = {
    userId: input.userId,
    archivedAt: null,
    expiresAt: { gt: now },
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
  }

  const existing = await prisma.aiWorkflowSession.findFirst({
    where: findWhere,
    orderBy: { updatedAt: "desc" },
  })

  if (existing) {
    return mapSessionEntity(existing, true)
  }

  if (!input.conversationId) {
    const latest = await prisma.aiWorkflowSession.findFirst({
      where: {
        userId: input.userId,
        archivedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { updatedAt: "desc" },
    })

    if (latest) return mapSessionEntity(latest, true)
  }

  const initial = createInitialMachineState()
  const created = await prisma.aiWorkflowSession.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId ?? createConversationId(),
      state: initial.state,
      intent: initial.intent,
      selectedTemplateId: initial.selectedTemplateId,
      recipientStats: asJson(initial.recipientStats),
      summary: initial.summary,
      contextJson: asJson(initial.context),
      expiresAt: buildDefaultExpiry(),
      lastActivityAt: now,
    },
  })

  await prisma.aiWorkflowCheckpoint.create({
    data: {
      sessionId: created.id,
      state: created.state,
      payload: asJson({
        createdAt: created.createdAt.toISOString(),
        context: initial.context,
      }),
    },
  })

  return mapSessionEntity(created, false)
}

export async function persistWorkflowState(input: {
  sessionId: string
  state: WorkflowMachineState
  checkpointPayload?: Record<string, unknown> | null
}) {
  const now = new Date()
  const expiresAt = buildDefaultExpiry()

  const updated = await prisma.aiWorkflowSession.update({
    where: { id: input.sessionId },
    data: {
      state: input.state.state,
      intent: input.state.intent,
      selectedTemplateId: input.state.selectedTemplateId,
      recipientStats: asJson(input.state.recipientStats),
      summary: input.state.summary,
      contextJson: asJson(input.state.context),
      lastActivityAt: now,
      expiresAt,
    },
  })

  await prisma.aiWorkflowCheckpoint.create({
    data: {
      sessionId: input.sessionId,
      state: input.state.state,
      payload: asJson({
        summary: input.state.summary,
        context: input.state.context,
        recipientStats: input.state.recipientStats,
        selectedTemplateId: input.state.selectedTemplateId,
        ...(input.checkpointPayload ?? {}),
      }),
    },
  })

  return mapSessionEntity(updated, true)
}

export async function getLatestWorkflowSession(userId: string) {
  const now = new Date()
  const latest = await prisma.aiWorkflowSession.findFirst({
    where: {
      userId,
      archivedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      checkpoints: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!latest) return null

  return {
    session: mapSessionEntity(latest, true),
    lastCheckpoint: latest.checkpoints[0] ?? null,
  }
}

export async function getWorkflowSessionByConversationId(input: { userId: string; conversationId: string }) {
  const now = new Date()
  const found = await prisma.aiWorkflowSession.findFirst({
    where: {
      userId: input.userId,
      conversationId: input.conversationId,
      archivedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      checkpoints: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!found) return null

  return {
    session: mapSessionEntity(found, true),
    lastCheckpoint: found.checkpoints[0] ?? null,
  }
}

export type WorkflowSessionListItem = {
  conversationId: string
  state: WorkflowMachineState["state"]
  intent: WorkflowMachineState["intent"]
  selectedTemplateId: string | null
  summary: string | null
  context: WorkflowMachineState["context"]
  recipientStats: WorkflowMachineState["recipientStats"]
  lastActivityAt: Date
  createdAt: Date
}

export async function listWorkflowSessions(input: { userId: string; limit?: number }): Promise<WorkflowSessionListItem[]> {
  const now = new Date()
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
  const sessions = await prisma.aiWorkflowSession.findMany({
    where: {
      userId: input.userId,
      archivedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { lastActivityAt: "desc" },
    take: limit,
  })

  return sessions.map((session) => {
    const hydrated = hydrateMachineState({
      state: session.state,
      intent: session.intent,
      selectedTemplateId: session.selectedTemplateId,
      recipientStats: session.recipientStats as WorkflowMachineState["recipientStats"],
      summary: session.summary,
      context: (session.contextJson as WorkflowMachineState["context"] | null) ?? {},
    })

    return {
      conversationId: session.conversationId,
      state: hydrated.state,
      intent: hydrated.intent,
      selectedTemplateId: session.selectedTemplateId,
      summary: session.summary,
      context: hydrated.context,
      recipientStats: hydrated.recipientStats,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    }
  })
}
