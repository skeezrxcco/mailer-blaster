import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: "session-token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  response.cookies.set({
    name: "__Secure-session-token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  })

  return response
}
