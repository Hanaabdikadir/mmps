import "server-only";
import nodemailer from "nodemailer";
import { readLocalSmtp, writeLocalSmtp } from "@/lib/smtp-local";

function appBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

export type SmtpAuth = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

async function resolveSmtp(override?: Partial<SmtpAuth>): Promise<SmtpAuth | null> {
  const envUser = process.env.SMTP_USER?.trim() || "";
  const envPass = (
    process.env.SMTP_PASS?.trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    ""
  ).replace(/\s/g, "");
  if (envUser && envPass) {
    return {
      host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587) || 587,
      user: envUser,
      pass: envPass,
    };
  }
  const local = await readLocalSmtp();
  if (local) return local;
  const user = String(override?.user || "").trim();
  const pass = String(override?.pass || "").replace(/\s/g, "");
  if (user && pass) {
    return {
      host: override?.host?.trim() || "smtp.gmail.com",
      port: Number(override?.port || 587) || 587,
      user,
      pass,
    };
  }
  return null;
}

export async function isSmtpConfigured(): Promise<boolean> {
  return Boolean(await resolveSmtp());
}

async function sendViaGmailInbox(opts: {
  to: string;
  subject: string;
  text: string;
  code?: string;
}): Promise<void> {
  const browserHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: "https://formsubmit.co",
    Referer: "https://formsubmit.co/",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  } as const;

  const payload: Record<string, string> = {
    _subject: opts.subject,
    _template: "table",
    _captcha: "false",
    name: "MMPS",
    message: opts.text,
  };
  if (opts.code) {
    payload.code = opts.code;
  }

  async function postJson(url: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: browserHeaders,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: string | boolean;
      message?: string;
    };
    return { res, data };
  }

  const ajaxUrl = `https://formsubmit.co/ajax/${encodeURIComponent(opts.to)}`;
  const { res, data } = await postJson(ajaxUrl);
  const message = String(data.message || "").toLowerCase();
  const blocked = message.includes("html files") || message.includes("will not work");
  const activated =
    data.success === true ||
    data.success === "true" ||
    message.includes("activation") ||
    message.includes("activate form") ||
    message.includes("form is now active");

  if (res.ok && !blocked && activated) {
    return;
  }

  throw new Error(data.message || `Inbox delivery failed (${res.status})`);
}

async function sendViaGmailMx(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const hosts = ["aspmx.l.google.com", "alt1.aspmx.l.google.com"];
  let lastError: unknown;
  for (const host of hosts) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: 25,
        secure: false,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
        tls: { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from: `"MMPS" <noreply@mmps.so>`,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        headers: {
          "X-Mailer": "MMPS",
          "X-Priority": "3",
        },
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Gmail MX delivery failed");
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  code: string;
  fullName?: string;
  smtp?: Partial<SmtpAuth>;
  persistSmtp?: boolean;
}): Promise<{ sent: boolean }> {
  const name = opts.fullName?.trim() || "there";
  const subject = `MMPS code ${opts.code}`;
  const text = [
    `MMPS 6-digit code: ${opts.code}`,
    "",
    `Hello ${name},`,
    "",
    "Reset your MMPS user password.",
    "Confirmation code:",
    opts.code,
    "",
    "Or open this link:",
    opts.resetUrl,
    "",
    "The code and link expire in 1 hour.",
    "",
    "— MMPS · Muqdishu Market Price System",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.12em;color:#e11d48;text-transform:uppercase">MMPS</p>
        <h2 style="color:#0f172a;margin:0 0 14px;font-size:22px">Reset your password</h2>
        <p style="margin:0 0 14px;line-height:1.55;color:#334155">Hello ${name},</p>
        <p style="margin:0 0 12px;line-height:1.55;color:#334155">
          Use this confirmation code in MMPS, then choose a new password.
        </p>
        <p style="margin:0 0 18px;font-size:28px;font-weight:800;letter-spacing:0.28em;color:#0f172a">${opts.code}</p>
        <p style="margin:0 0 18px">
          <a href="${opts.resetUrl}"
             style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">
            Open reset link
          </a>
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
          If you did not request a reset, ignore this email.
        </p>
      </div>
    </div>
  `;

  const smtp = await resolveSmtp(opts.smtp);
  if (smtp) {
    const transporter = nodemailer.createTransport({
      service: smtp.host.includes("gmail") ? "gmail" : undefined,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    await transporter.sendMail({
      from: `"MMPS" <${smtp.user}>`,
      to: opts.to,
      subject,
      text,
      html,
    });

    if (opts.persistSmtp) {
      await writeLocalSmtp(smtp);
    }
    return { sent: true };
  }

  await sendViaGmailInbox({
    to: opts.to,
    subject,
    text,
    code: opts.code,
  });
  return { sent: true };
}

export async function sendOtpEmail(opts: {
  to: string;
  code: string;
  purpose: "login" | "reset";
  fullName?: string;
}): Promise<{ sent: boolean }> {
  const resetUrl = `${appBaseUrl()}/forgot-password`;
  return sendPasswordResetEmail({
    to: opts.to,
    resetUrl,
    code: opts.code,
    fullName: opts.fullName,
  });
}

export function buildPasswordResetUrl(token: string): string {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function maskEmail(email: string): string {
  const value = email.trim().toLowerCase();
  const at = value.indexOf("@");
  if (at < 1) return "***";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
