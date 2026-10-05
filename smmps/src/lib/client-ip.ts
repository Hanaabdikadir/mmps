export function clientIpFromHeaders(h: Headers): string {
  const raw =
    h.get("x-forwarded-for") ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "";
  const ip = raw.split(",")[0]?.trim() || "";
  if (!ip || ip === "anon" || ip === "unknown") return "127.0.0.1";
  return ip.slice(0, 64);
}
