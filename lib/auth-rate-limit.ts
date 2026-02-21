type Bucket = {
  timestamps: number[]
}

type LimitInput = {
  key: string
  limit: number
  windowSeconds: number
}

type LimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

declare global {
  // eslint-disable-next-line no-var
  var __authRateBuckets: Map<string, Bucket> | undefined
}

const buckets = global.__authRateBuckets ?? new Map<string, Bucket>()
if (!global.__authRateBuckets) {
  global.__authRateBuckets = buckets
}

function isTruthy(value: string | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}

export function isAuthRateLimitDisabled() {
  const disabledEverywhere = isTruthy(process.env.AUTH_RATE_LIMIT_DISABLED)
  const disabledInDev = process.env.NODE_ENV !== "production" && isTruthy(process.env.AUTH_RATE_LIMIT_DISABLE_IN_DEV ?? "true")
  return disabledEverywhere || disabledInDev
}

function prune(bucket: Bucket, windowMs: number, now: number) {
  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs)
}

export function checkRateLimit(input: LimitInput): LimitResult {
  if (isAuthRateLimitDisabled()) {
    return {
      allowed: true,
      remaining: input.limit,
      retryAfterSeconds: 0,
    }
  }

  const now = Date.now()
  const windowMs = input.windowSeconds * 1000
  const bucket = buckets.get(input.key) ?? { timestamps: [] }

  prune(bucket, windowMs, now)

  if (bucket.timestamps.length >= input.limit) {
    const oldest = bucket.timestamps[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
    buckets.set(input.key, bucket)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  bucket.timestamps.push(now)
  buckets.set(input.key, bucket)

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - bucket.timestamps.length),
    retryAfterSeconds: 0,
  }
}

export function buildRateLimitKey(parts: Array<string | undefined | null>) {
  return parts
    .map((part) => (part && part.trim() ? part.trim().toLowerCase() : "unknown"))
    .join(":")
}
