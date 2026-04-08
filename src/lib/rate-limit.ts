import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

interface Entry {
  count: number
  resetAt: number
}

// In-memory store — resets per server instance (acceptable for simple rate limiting)
const store = new Map<string, Entry>()

let lastCleanup = Date.now()
function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? '127.0.0.1'
}

/**
 * Returns a 429 response if `ip` has exceeded `max` requests within `windowMs`.
 * Returns null if the request is allowed.
 */
export function checkRateLimit(
  ip: string,
  max = 10,
  windowMs = 60_000,
): NextResponse | null {
  maybeCleanup()
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++
  if (entry.count > max) {
    return NextResponse.json(
      { error: 'Too many requests — please wait a minute and try again' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      },
    )
  }

  return null
}
