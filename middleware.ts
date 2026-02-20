import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const protectedPrefixes = ["/chat", "/templates", "/contacts", "/activity", "/campaigns", "/settings", "/pricing", "/checkout"]
const authPages = ["/login", "/signup"]

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function hasSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get("session-token")?.value ||
      request.cookies.get("__Secure-session-token")?.value ||
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value,
  )
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthenticated = hasSessionCookie(request)

  if (!isAuthenticated && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && authPages.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/chat"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/templates/:path*",
    "/contacts/:path*",
    "/activity/:path*",
    "/campaigns/:path*",
    "/settings/:path*",
    "/pricing/:path*",
    "/checkout/:path*",
    "/login",
    "/signup",
  ],
}
