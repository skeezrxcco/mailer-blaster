import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

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

  return NextResponse.next()
}

export const config = {
  matcher: ["/:path*"],
}
