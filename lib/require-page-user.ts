import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildSessionUserSummary, type SessionUserSummary } from "@/types/session-user"

export async function requirePageUser(nextPath: string): Promise<SessionUserSummary> {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user
  const userEmail = sessionUser?.email?.trim()
  if (!sessionUser || !userEmail) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
    select: {
      name: true,
      email: true,
      image: true,
      plan: true,
    },
  })

  return buildSessionUserSummary({
    name: dbUser?.name ?? sessionUser.name,
    email: dbUser?.email ?? userEmail,
    image: dbUser?.image ?? sessionUser.image,
    plan: dbUser?.plan ?? sessionUser.plan,
  })
}
