type HeaderGetter = {
  get(name: string): string | null | undefined
}

function normalizeHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "")
  if (typeof value === "string") return value
  return ""
}

export function extractClientIp(headersLike?: HeaderGetter | Record<string, unknown> | null): string {
  if (!headersLike) return "unknown"

  const getHeader = (name: string): string => {
    if (typeof (headersLike as HeaderGetter).get === "function") {
      return normalizeHeaderValue((headersLike as HeaderGetter).get(name))
    }
    const key = Object.keys(headersLike).find((k) => k.toLowerCase() === name.toLowerCase())
    if (!key) return ""
    return normalizeHeaderValue((headersLike as Record<string, unknown>)[key])
  }

  const forwardedFor = getHeader("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const realIp = getHeader("x-real-ip")
  if (realIp) return realIp.trim()

  return "unknown"
}

export function extractUserAgent(headersLike?: HeaderGetter | Record<string, unknown> | null): string {
  if (!headersLike) return "unknown"
  if (typeof (headersLike as HeaderGetter).get === "function") {
    return (headersLike as HeaderGetter).get("user-agent")?.toString().trim() || "unknown"
  }
  const key = Object.keys(headersLike).find((k) => k.toLowerCase() === "user-agent")
  if (!key) return "unknown"
  const value = (headersLike as Record<string, unknown>)[key]
  return normalizeHeaderValue(value).trim() || "unknown"
}
