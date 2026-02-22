import { hash } from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/blastermailer?schema=public"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function ensureUser(input) {
  const passwordHash = await hash(input.password, 12)
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      plan: input.plan,
      role: input.role,
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      name: input.name,
      email: input.email,
      plan: input.plan,
      role: input.role,
      passwordHash,
      emailVerified: new Date(),
    },
  })
}

async function ensureContacts(userId, contacts) {
  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: {
        userId_email: {
          userId,
          email: contact.email,
        },
      },
      update: {
        name: contact.name,
      },
      create: {
        userId,
        email: contact.email,
        name: contact.name,
        source: "seed",
        status: "subscribed",
      },
    })
  }
}

async function ensureCampaign(userId) {
  const existing = await prisma.campaign.findFirst({
    where: { userId, name: "Welcome campaign" },
    select: { id: true },
  })
  if (existing) return existing
  return prisma.campaign.create({
    data: {
      userId,
      name: "Welcome campaign",
      status: "DRAFT",
      audienceCount: 0,
    },
    select: { id: true },
  })
}

async function main() {
  const admin = await ensureUser({
    email: "admin@blastermailer.local",
    name: "Blastermailer Admin",
    password: "ChangeMe123!",
    role: "admin",
    plan: "pro",
  })

  const starter = await ensureUser({
    email: "starter@blastermailer.local",
    name: "Starter User",
    password: "ChangeMe123!",
    role: "user",
    plan: "starter",
  })

  const pro = await ensureUser({
    email: "pro@blastermailer.local",
    name: "Pro User",
    password: "ChangeMe123!",
    role: "user",
    plan: "pro",
  })

  await ensureContacts(admin.id, [
    { email: "ops@example.com", name: "Ops Team" },
    { email: "marketing@example.com", name: "Marketing Team" },
  ])
  await ensureContacts(starter.id, [
    { email: "first-contact@example.com", name: "First Contact" },
  ])
  await ensureContacts(pro.id, [
    { email: "vip-contact@example.com", name: "VIP Contact" },
  ])

  await ensureCampaign(admin.id)
  await ensureCampaign(starter.id)
  await ensureCampaign(pro.id)

  await prisma.waitingList.upsert({
    where: { email: "launch-interest@example.com" },
    update: { name: "Launch Interest" },
    create: {
      email: "launch-interest@example.com",
      name: "Launch Interest",
      source: "seed",
    },
  })

  console.log("Seed complete:")
  console.log("- admin@blastermailer.local / ChangeMe123!")
  console.log("- starter@blastermailer.local / ChangeMe123!")
  console.log("- pro@blastermailer.local / ChangeMe123!")
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
