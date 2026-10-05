import { NextResponse } from "next/server";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { isSmtpConfigured } from "@/lib/mailer";
import { writeLocalSmtp } from "@/lib/smtp-local";

export async function GET() {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return NextResponse.json({ configured: await isSmtpConfigured() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser("super");
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => ({}));
  const smtpUser =
    typeof (body as { user?: unknown }).user === "string"
      ? (body as { user: string }).user.trim().toLowerCase()
      : "";
  const smtpPass =
    typeof (body as { pass?: unknown }).pass === "string"
      ? (body as { pass: string }).pass.replace(/\s/g, "")
      : "";
  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "Gmail and App Password are required" },
      { status: 400 }
    );
  }
  await writeLocalSmtp({
    host: "smtp.gmail.com",
    port: 587,
    user: smtpUser,
    pass: smtpPass,
  });
  return NextResponse.json({ ok: true, configured: true });
}
