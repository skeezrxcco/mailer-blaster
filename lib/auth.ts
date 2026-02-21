import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import EmailProvider from "next-auth/providers/email"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"

import { sendEmail } from "@/lib/email"
import { verifyAndConsumeAuthCode } from "@/lib/auth-code"
import { verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      code: { label: "Code", type: "text" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase()
      const password = String(credentials?.password ?? "")
      const code = String(credentials?.code ?? "").trim()

      if (!email || !password || !code) return null

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user?.passwordHash) return null

      const isValid = await verifyPassword(password, user.passwordHash)
      if (!isValid) return null

      const isValidCode = await verifyAndConsumeAuthCode({
        userId: user.id,
        purpose: "login",
        code,
      })
      if (!isValidCode) return null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        plan: user.plan,
      }
    },
  }),
]

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  )
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
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
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.plan = user.plan ?? "starter"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "")
        session.user.plan = (token.plan as string | undefined) ?? "starter"
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}
