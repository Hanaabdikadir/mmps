import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const LIMIT = 10;

export function rateLimit(key: string, limit = LIMIT, windowMs = WINDOW_MS) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true };
}

export function rateLimitedResponse(retryAfterSec = 60) {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}
