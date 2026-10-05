/**
 * Allow only same-origin relative paths after login / idle timeout.
 * Blocks protocol-relative URLs, other origins, and auth loops.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    // already decoded or malformed — use as-is
  }
  value = value.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;

  const path = value.split("?")[0] ?? "";
  if (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/register" ||
    path.startsWith("/register/")
  ) {
    return null;
  }

  return value;
}
