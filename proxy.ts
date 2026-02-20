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

function isWaitlistModeEnabled() {
  const fallback = process.env.NODE_ENV === "production" ? "true" : "false"
  const raw = (process.env.WAITLIST_MODE ?? fallback).trim().toLowerCase()
  return raw === "true" || raw === "1" || raw === "yes"
}

function shouldBypassWaitlist(pathname: string) {
  if (pathname === "/") return true
  if (pathname.startsWith("/api/")) return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/icon")) return true
  if (pathname.startsWith("/apple-icon")) return true
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") return true
  return false
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isWaitlistModeEnabled() && !shouldBypassWaitlist(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

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
  matcher: ["/:path*"],
}

