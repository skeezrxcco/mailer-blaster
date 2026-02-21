import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import EmailProvider from "next-auth/providers/email"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"

import { buildRateLimitKey, checkRateLimit } from "@/lib/auth-rate-limit"
import { recordAuthEvent, registerAuthFailureAndInvalidateIfNeeded } from "@/lib/auth-security"
import { sendEmail } from "@/lib/email"
import { verifyAndConsumeAuthCode } from "@/lib/auth-code"
import { verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { extractClientIp, extractUserAgent } from "@/lib/request-context"

const IS_PRODUCTION = process.env.NODE_ENV === "production"

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      code: { label: "Code", type: "text" },
    },
    async authorize(credentials, request) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase()
      const password = String(credentials?.password ?? "")
      const code = String(credentials?.code ?? "").trim()
      const headers = request?.headers
      const ipAddress = extractClientIp(headers)
      const userAgent = extractUserAgent(headers)

      const limit = checkRateLimit({
        key: buildRateLimitKey(["credentials-verify", ipAddress, email]),
        limit: 10,
        windowSeconds: 10 * 60,
      })

      if (!limit.allowed) {
        await recordAuthEvent({
          type: "credentials_rate_limited",
          severity: "warn",
          email,
          ipAddress,
          userAgent,
          metadata: {
            retryAfterSeconds: limit.retryAfterSeconds,
          },
        })
        return null
      }

      if (!email || !password || !code) return null

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user?.passwordHash) {
        await registerAuthFailureAndInvalidateIfNeeded({
          email,
          ipAddress,
          userAgent,
          reason: "credentials-user-not-found-or-social-only",
        })
        return null
      }

      const isValid = await verifyPassword(password, user.passwordHash)
      if (!isValid) {
        await registerAuthFailureAndInvalidateIfNeeded({
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          reason: "credentials-invalid-password",
        })
        return null
      }

      const isValidCode = await verifyAndConsumeAuthCode({
        userId: user.id,
        purpose: "login",
        code,
      })
      if (!isValidCode) {
        await registerAuthFailureAndInvalidateIfNeeded({
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          reason: "credentials-invalid-code",
        })
        return null
      }

      if (!user.emailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
          },
        })
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        plan: user.plan,
        role: user.role,
        sessionVersion: user.sessionVersion,
      }
    },
  }),
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  )
}

if (process.env.AUTH_EMAIL_FROM && (process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.AUTH_RESEND_API_KEY)) {
  providers.push(
    EmailProvider({
      from: process.env.AUTH_EMAIL_FROM,
      server:
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || "587"),
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            }
          : undefined,
      async sendVerificationRequest({ identifier, url, provider }) {
        await sendEmail({
          to: identifier,
          from: provider.from,
          subject: "Your sign-in link",
          html: `<p>Sign in to blastermailer:</p><p><a href="${url}">${url}</a></p>`,
          text: `Sign in to blastermailer: ${url}`,
        })
      },
    }),
  )
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.type !== "oauth") return true

      const email = user.email?.trim().toLowerCase()
      if (!email) {
        await recordAuthEvent({
          type: "oauth_missing_email",
          severity: "warn",
          metadata: { provider: account.provider },
        })
        return false
      }

      const googleEmailVerified =
        account.provider !== "google" || Boolean((profile as { email_verified?: boolean } | null)?.email_verified)

      if (account.provider === "google" && !googleEmailVerified) {
        await recordAuthEvent({
          type: "oauth_unverified_google_email",
          severity: "warn",
          email,
          metadata: { provider: account.provider },
        })
        return false
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          emailVerified: true,
          passwordHash: true,
          accounts: {
            where: {
              provider: account.provider,
            },
            select: {
              providerAccountId: true,
            },
          },
        },
      })

      if (existingUser && existingUser.accounts.length === 0 && existingUser.passwordHash && !existingUser.emailVerified) {
        await recordAuthEvent({
          type: "oauth_blocked_unverified_credentials_account",
          severity: "warn",
          userId: existingUser.id,
          email,
          metadata: { provider: account.provider },
        })
        return false
      }

      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.plan = user.plan ?? "starter"
      }
      return session
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.type !== "oauth") return

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      })
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  useSecureCookies: IS_PRODUCTION,
  cookies: {
    sessionToken: {
      name: IS_PRODUCTION ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: IS_PRODUCTION,
      },
    },
    callbackUrl: {
      name: IS_PRODUCTION ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: IS_PRODUCTION,
      },
    },
    csrfToken: {
      name: IS_PRODUCTION ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: IS_PRODUCTION,
      },
    },
  },
}
