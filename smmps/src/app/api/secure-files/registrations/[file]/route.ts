import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getCurrentUser,
  isSuperAdmin,
  verifyToken,
} from "@/lib/auth";
import { AUTH_PORTAL_COOKIES, AUTH_PORTALS } from "@/lib/auth-portal";
import {
  canViewRegistrationFile,
  mimeForRegistrationFile,
  readRegistrationFileBuffer,
  sanitizeRegistrationFileName,
} from "@/lib/secure-registration-files";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ file?: string }> };

function hasAnyAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): boolean {
  for (const portal of AUTH_PORTALS) {
    const raw = cookieStore.get(AUTH_PORTAL_COOKIES[portal])?.value;
    if (raw && verifyToken(raw)) return true;
  }
  // Tab session cookies
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("mmps_sess_") && c.value && verifyToken(c.value)) {
      return true;
    }
  }
  return false;
}

export async function GET(request: Request, ctx: Ctx) {
  const cookieStore = await cookies();

  // Hard gate: no valid session cookie → login page (never serve the file).
  if (!hasAnyAuthCookie(cookieStore)) {
    const url = new URL(request.url);
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(login, {
      status: 302,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  }

  const user =
    (await getCurrentUser("auto")) ||
    (await getCurrentUser("super")) ||
    (await getCurrentUser("admin")) ||
    (await getCurrentUser("broker")) ||
    (await getCurrentUser("user"));

  if (!user) {
    const url = new URL(request.url);
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(login, 302);
  }

  const { file: raw } = await ctx.params;
  const fileName = sanitizeRegistrationFileName(
    decodeURIComponent(String(raw || ""))
  );
  if (!fileName) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const allowed =
    isSuperAdmin(user) || (await canViewRegistrationFile(user, fileName));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await readRegistrationFileBuffer(fileName);
  if (!buffer) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeForRegistrationFile(fileName),
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
