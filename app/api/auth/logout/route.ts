import { NextResponse } from "next/server"

import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  await ensureDevAuthSchema()

  const sessionToken =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((item) => item.trim())
      .find(
        (item) =>
          item.startsWith("next-auth.session-token=") ||
          item.startsWith("__Secure-next-auth.session-token=") ||
          item.startsWith("session-token=") ||
          item.startsWith("__Secure-session-token="),
      )
      ?.split("=")[1] ?? ""

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: {
        sessionToken: decodeURIComponent(sessionToken),
      },
    })
  }

  const response = NextResponse.json({ ok: true })

  const cookieNames = [
    "session-token",
    "__Secure-session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ]
  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: name.includes("session-token"),
      sameSite: "lax",
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
      path: "/",
      maxAge: 0,
    })
  }

  return response
}
