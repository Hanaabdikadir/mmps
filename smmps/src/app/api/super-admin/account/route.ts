import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  getCookieForResponse,
  hashPassword,
  isSuperAdmin,
  setAuthCookie,
  signToken,
  type AuthUser,
} from "@/lib/auth";
import {
  getSystemSettings,
  saveSystemSettings,
} from "@/lib/system-settings-store";

export async function GET() {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const system = await getSystemSettings();
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePicture: true },
    });
    return NextResponse.json({
      account: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: row?.profilePicture ?? null,
      },
      system,
    });
  } catch (error) {
    console.error("[super-admin/account GET]", error);
    return NextResponse.json(
      { error: "Account settings service is temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const fullName =
    typeof (body as { fullName?: unknown }).fullName === "string"
      ? (body as { fullName: string }).fullName.trim()
      : undefined;
  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : undefined;
  const password =
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : undefined;
  const confirmPassword =
    typeof (body as { confirmPassword?: unknown }).confirmPassword === "string"
      ? (body as { confirmPassword: string }).confirmPassword
      : undefined;
  const systemName =
    typeof (body as { systemName?: unknown }).systemName === "string"
      ? (body as { systemName: string }).systemName.trim()
      : undefined;
  const supportEmail =
    typeof (body as { supportEmail?: unknown }).supportEmail === "string"
      ? (body as { supportEmail: string }).supportEmail.trim().toLowerCase()
      : undefined;

  if (!fullName && !email && !password && !systemName && !supportEmail) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid login email" }, { status: 400 });
  }

  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return NextResponse.json(
      { error: "Invalid support email" },
      { status: 400 }
    );
  }

  if (password !== undefined && password.length > 0 && password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  if (password !== undefined && password.length > 0) {
    if (confirmPassword === undefined || password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }
  }

  const nextFullName = fullName || user.fullName;
  const nextEmail = email || user.email.toLowerCase();
  const nextPassword =
    password && password.trim() ? password.trim() : undefined;

  try {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id, role: "SUPER_ADMIN" },
          { email: user.email, role: "SUPER_ADMIN" },
        ],
      },
      select: { id: true, email: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Super Admin account was not found in the database" },
        { status: 404 }
      );
    }

    if (nextEmail !== dbUser.email.toLowerCase()) {
      const clash = await prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (clash && clash.id !== dbUser.id) {
        return NextResponse.json(
          { error: "That email is already in use" },
          { status: 409 }
        );
      }
    }

    const data: Prisma.UserUpdateInput = {
      fullName: nextFullName,
      email: nextEmail,
    };
    if (nextPassword) {
      data.password = await hashPassword(nextPassword);
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data,
    });

    const system = await saveSystemSettings({
      systemName,
      supportEmail,
    });

    const authUser: AuthUser = {
      id: dbUser.id,
      fullName: nextFullName,
      email: nextEmail,
      role: "SUPER_ADMIN",
      status: user.status,
      companySlug: user.companySlug,
    };

    const token = signToken(authUser);
    await setAuthCookie(token, undefined, "super");
    const response = NextResponse.json({
      ok: true,
      account: {
        id: authUser.id,
        fullName: authUser.fullName,
        email: authUser.email,
        role: authUser.role,
      },
      system,
    });
    const cookie = getCookieForResponse(token, undefined, "super");
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("[super-admin/account PATCH]", error);
    return NextResponse.json(
      { error: "Account settings service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
