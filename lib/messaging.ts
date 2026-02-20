import { Prisma, type MessageRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type CreateMessageInput = {
  userId?: string | null
  role: MessageRole
  content: string
  channel?: string
  conversationId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function createMessage(input: CreateMessageInput) {
  return prisma.message.create({
    data: {
      userId: input.userId ?? null,
      role: input.role,
      content: input.content,
      channel: input.channel ?? "chat",
      conversationId: input.conversationId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function listMessages(input: {
  userId?: string | null
  channel?: string
  limit?: number
}) {
  return prisma.message.findMany({
    where: {
      userId: input.userId ?? undefined,
      channel: input.channel ?? undefined,
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(input.limit ?? 50, 1), 200),
  })
}
