import NextAuth from "next-auth"

import { authOptions } from "@/lib/auth"
import { ensureDevAuthSchema } from "@/lib/auth-schema-bootstrap"

const handler = NextAuth(authOptions)

export async function GET(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  await ensureDevAuthSchema()
  return handler(request, context)
}

export async function POST(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  await ensureDevAuthSchema()
  return handler(request, context)
}
