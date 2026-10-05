import { NextResponse } from "next/server";
import { getCurrentUser, resolveRequestAuthPortal, type AuthUser } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac-db";
import type { Permission } from "@/lib/rbac-permissions";

export async function requireAuth(): Promise<
  { user: AuthUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const portal = await resolveRequestAuthPortal();
  const user = await getCurrentUser(portal === "auto" ? null : portal);
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

export async function requirePermission(permission: Permission): Promise<
  { user: AuthUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const allowed = await roleHasPermission(auth.user.role, permission);
  if (!allowed) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user: auth.user };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
