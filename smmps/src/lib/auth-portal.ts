/** Independent admin sessions: Super Admin, company admin, and broker can stay signed in together. */

export type AuthPortal = "super" | "admin" | "broker" | "user";

export const AUTH_PORTAL_STORAGE_KEY = "mmps_auth_portal";
export const AUTH_PORTAL_HEADER = "x-mmps-portal";
export const AUTH_PATH_HEADER = "x-mmps-pathname";

export const AUTH_PORTAL_COOKIES: Record<AuthPortal, string> = {
  super: "mmps_token_super",
  admin: "mmps_token_admin",
  broker: "mmps_token_broker",
  user: "mmps_token",
};

export const AUTH_PORTALS: AuthPortal[] = ["super", "admin", "broker", "user"];

export function isAuthPortal(value: string | null | undefined): value is AuthPortal {
  return (
    value === "super" ||
    value === "admin" ||
    value === "broker" ||
    value === "user"
  );
}

export function authPortalForRole(role?: string | null): AuthPortal {
  if (role === "SUPER_ADMIN") return "super";
  if (role === "COMPANY_ADMIN") {
    return "admin";
  }
  if (role === "LIVESTOCK_BROKER_USER") {
    return "broker";
  }
  return "user";
}

export function inferAuthPortalFromPath(
  pathname: string,
  refererPath = ""
): AuthPortal | "auto" {
  const p = pathname || "";
  const r = refererPath || "";
  const hit = (part: string) => p.includes(part) || r.includes(part);

  if (hit("/super-admin") || hit("/api/super-admin")) return "super";
  if (
    p === "/admin" ||
    p.startsWith("/admin/") ||
    r === "/admin" ||
    r.startsWith("/admin/") ||
    hit("/api/admin") ||
    hit("/api/company")
  ) {
    return "admin";
  }
  if (hit("/broker") || hit("/api/broker")) return "broker";
  return "auto";
}

export function refererPathname(referer: string | null | undefined): string {
  if (!referer) return "";
  try {
    return new URL(referer).pathname;
  } catch {
    return referer.startsWith("/") ? referer.split("?")[0] : "";
  }
}

export function readTabAuthPortal(): AuthPortal | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(AUTH_PORTAL_STORAGE_KEY);
    return isAuthPortal(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeTabAuthPortal(portal: AuthPortal): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_PORTAL_STORAGE_KEY, portal);
  } catch {
    // private mode / blocked storage
  }
}

export function authPortalHeaders(portal?: AuthPortal | null): HeadersInit {
  const resolved = portal ?? readTabAuthPortal();
  const headers: Record<string, string> = {};
  if (resolved) headers[AUTH_PORTAL_HEADER] = resolved;
  if (typeof window !== "undefined") {
    try {
      const slot = sessionStorage.getItem("mmps_tab_slot");
      if (slot) headers["x-mmps-tab"] = slot;
    } catch {
      // private mode
    }
  }
  return headers;
}
