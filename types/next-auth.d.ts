import type { DefaultSession } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      plan?: string
      role?: string
    }
  }

  interface User {
    plan?: string
    role?: string
    sessionVersion?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string
    plan?: string
    role?: string
    sessionVersion?: number
  }
}
