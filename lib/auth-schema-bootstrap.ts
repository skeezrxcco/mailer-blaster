import { prisma } from "@/lib/prisma"

declare global {
  // eslint-disable-next-line no-var
  var __authSchemaBootstrapPromise: Promise<void> | undefined
}

const bootstrapStatements = [
  `CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "role" TEXT NOT NULL DEFAULT 'user',
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "public"."User"("email");`,
  `ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);`,
  `CREATE TABLE IF NOT EXISTS "public"."AuthCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "AuthCode_userId_purpose_createdAt_idx" ON "public"."AuthCode"("userId","purpose","createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AuthCode_userId_purpose_codeHash_idx" ON "public"."AuthCode"("userId","purpose","codeHash");`,
  `CREATE INDEX IF NOT EXISTS "AuthCode_expiresAt_consumedAt_idx" ON "public"."AuthCode"("expiresAt","consumedAt");`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthCode_userId_fkey') THEN
      ALTER TABLE "public"."AuthCode"
      ADD CONSTRAINT "AuthCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "public"."Account"("provider","providerAccountId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "public"."Session"("sessionToken");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "public"."VerificationToken"("token");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier","token");`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
      ALTER TABLE "public"."Account"
      ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
      ALTER TABLE "public"."Session"
      ADD CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "public"."AuthSecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "email" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSecurityEvent_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "AuthSecurityEvent_userId_createdAt_idx" ON "public"."AuthSecurityEvent"("userId","createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AuthSecurityEvent_email_createdAt_idx" ON "public"."AuthSecurityEvent"("email","createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AuthSecurityEvent_type_createdAt_idx" ON "public"."AuthSecurityEvent"("type","createdAt");`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthSecurityEvent_userId_fkey') THEN
      ALTER TABLE "public"."AuthSecurityEvent"
      ADD CONSTRAINT "AuthSecurityEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;`,
]

async function runBootstrap() {
  for (const statement of bootstrapStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export async function ensureDevAuthSchema() {
  if (process.env.NODE_ENV === "production") return

  if (!global.__authSchemaBootstrapPromise) {
    global.__authSchemaBootstrapPromise = runBootstrap().catch((error) => {
      global.__authSchemaBootstrapPromise = undefined
      throw error
    })
  }
  await global.__authSchemaBootstrapPromise
}
