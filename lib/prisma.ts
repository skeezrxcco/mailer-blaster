import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
  // eslint-disable-next-line no-var
  var __prismaPool: Pool | undefined
}

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/blastermailer?schema=public"

const pool = global.__prismaPool ?? new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma =
  global.__prismaClient ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  global.__prismaPool = pool
  global.__prismaClient = prisma
}
