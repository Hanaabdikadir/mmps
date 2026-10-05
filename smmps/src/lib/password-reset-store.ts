import "server-only";
import { createHash, randomBytes, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export type ResetErrorCode =
  | "INVALID_OTP"
  | "INVALID_RESET_TOKEN"
  | "TOO_MANY_ATTEMPTS"
  | "EXPIRED";

export function resetErrorMessage(code: ResetErrorCode): string {
  switch (code) {
    case "INVALID_OTP":
      return "That confirmation code is incorrect.";
    case "INVALID_RESET_TOKEN":
      return "This reset request is invalid. Request a new code.";
    case "TOO_MANY_ATTEMPTS":
      return "Too many incorrect codes. Request a new email.";
    case "EXPIRED":
      return "This code has expired. Request a new email.";
    default:
      return "Could not verify the reset code.";
  }
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sixDigitCode(): string {
  return String(randomInt(100000, 1000000));
}

type TokenRow = {
  id: string;
  code_hash: string | null;
  attempts: number | null;
  expires_at: Date;
  email: string;
  full_name: string | null;
};

export async function createPasswordResetToken(email: string): Promise<{
  token: string;
  code: string;
  expiresAt: string;
}> {
  const normalized = email.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const code = sixDigitCode();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const user = await withDbTimeout(
    prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    })
  );
  if (!user) {
    throw new Error("Cannot create a password reset token for an unknown user");
  }

  const id = randomBytes(16).toString("hex");
  const now = new Date();
  await withDbTimeout(
    prisma.$executeRaw`
      UPDATE password_reset_tokens
      SET used_at = ${now}
      WHERE user_id = ${user.id} AND used_at IS NULL
    `
  );
  await withDbTimeout(
    prisma.$executeRaw`
      INSERT INTO password_reset_tokens
        (id, user_id, token_hash, code_hash, attempts, last_sent_at, expires_at, created_at)
      VALUES
        (${id}, ${user.id}, ${hashResetToken(token)}, ${hashResetToken(code)}, 0, ${now}, ${expiresAt}, ${now})
    `
  );
  return { token, code, expiresAt: expiresAt.toISOString() };
}

type VerifyOk = {
  ok: true;
  authToken: string;
  expiresAt: Date;
};

type VerifyFail = {
  ok: false;
  code: ResetErrorCode;
  attemptsRemaining?: number;
};

async function verifyRecordOtp(
  record: {
    id: string;
    code_hash: string | null;
    attempts: number | null;
    expires_at: Date;
  },
  code: string
): Promise<VerifyOk | VerifyFail> {
  const now = new Date();
  if (record.expires_at <= now) return { ok: false, code: "EXPIRED" };
  if (!record.code_hash) return { ok: false, code: "INVALID_OTP" };
  const attempts = record.attempts ?? 0;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, code: "TOO_MANY_ATTEMPTS" };
  }
  if (hashResetToken(code) !== record.code_hash) {
    const next = attempts + 1;
    await withDbTimeout(
      prisma.$executeRaw`
        UPDATE password_reset_tokens SET attempts = ${next} WHERE id = ${record.id}
      `
    );
    if (next >= MAX_OTP_ATTEMPTS) {
      return { ok: false, code: "TOO_MANY_ATTEMPTS" };
    }
    return {
      ok: false,
      code: "INVALID_OTP",
      attemptsRemaining: MAX_OTP_ATTEMPTS - next,
    };
  }

  const authToken = randomBytes(32).toString("hex");
  await withDbTimeout(
    prisma.$executeRaw`
      UPDATE password_reset_tokens
      SET token_hash = ${hashResetToken(authToken)},
          code_hash = NULL,
          attempts = 0
      WHERE id = ${record.id}
    `
  );
  return { ok: true, authToken, expiresAt: record.expires_at };
}

export async function verifyPasswordResetOtp(
  resetToken: string,
  code: string
): Promise<VerifyOk | VerifyFail> {
  const trimmed = (code || "").replace(/\D/g, "");
  if (trimmed.length !== 6) return { ok: false, code: "INVALID_OTP" };
  const tokenHash = hashResetToken(resetToken.trim());
  const rows = await withDbTimeout(
    prisma.$queryRaw<TokenRow[]>`
      SELECT t.id, t.code_hash, t.attempts, t.expires_at, u.email, u.full_name
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ${tokenHash}
        AND t.used_at IS NULL
        AND t.expires_at > NOW()
      LIMIT 1
    `
  );
  const record = rows[0];
  if (!record) return { ok: false, code: "INVALID_RESET_TOKEN" };
  return verifyRecordOtp(record, trimmed);
}

export async function verifyPasswordResetOtpByEmail(
  email: string,
  code: string
): Promise<VerifyOk | VerifyFail> {
  const trimmed = (code || "").replace(/\D/g, "");
  if (trimmed.length !== 6) return { ok: false, code: "INVALID_OTP" };
  const normalized = email.trim().toLowerCase();
  const rows = await withDbTimeout(
    prisma.$queryRaw<TokenRow[]>`
      SELECT t.id, t.code_hash, t.attempts, t.expires_at, u.email, u.full_name
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE lower(u.email) = ${normalized}
        AND t.used_at IS NULL
        AND t.code_hash IS NOT NULL
        AND t.expires_at > NOW()
      ORDER BY t.created_at DESC
      LIMIT 1
    `
  );
  const record = rows[0];
  if (!record) return { ok: false, code: "INVALID_RESET_TOKEN" };
  return verifyRecordOtp(record, trimmed);
}

export async function consumePasswordResetToken(
  token: string
): Promise<{ email: string } | null> {
  const tokenHash = hashResetToken(token);
  const rows = await withDbTimeout(
    prisma.$queryRaw<{ id: string; email: string }[]>`
      SELECT t.id, u.email
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ${tokenHash}
        AND t.used_at IS NULL
        AND t.code_hash IS NULL
        AND t.expires_at > NOW()
      LIMIT 1
    `
  );
  const record = rows[0];
  if (!record) return null;
  const now = new Date();
  const updated = await withDbTimeout(
    prisma.$executeRaw`
      UPDATE password_reset_tokens
      SET used_at = ${now}
      WHERE id = ${record.id} AND used_at IS NULL AND expires_at > ${now}
    `
  );
  return updated === 1 ? { email: record.email } : null;
}

export async function peekPasswordResetToken(
  token: string
): Promise<{ email: string; expiresAt: string } | null> {
  const tokenHash = hashResetToken(token);
  const rows = await withDbTimeout(
    prisma.$queryRaw<{ email: string; expires_at: Date }[]>`
      SELECT u.email, t.expires_at
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ${tokenHash}
        AND t.used_at IS NULL
        AND t.expires_at > NOW()
      LIMIT 1
    `
  );
  const record = rows[0];
  if (!record) return null;
  return {
    email: record.email,
    expiresAt: new Date(record.expires_at).toISOString(),
  };
}

export async function resendEmailOtp(
  token: string,
  purpose: "LOGIN" | "RESET"
): Promise<
  | { ok: true; email: string; code: string; fullName?: string }
  | { ok: false; code: ResetErrorCode }
> {
  if (purpose !== "RESET" || !token.trim()) {
    return { ok: false, code: "INVALID_RESET_TOKEN" };
  }
  const tokenHash = hashResetToken(token.trim());
  const rows = await withDbTimeout(
    prisma.$queryRaw<{ id: string; email: string; full_name: string | null }[]>`
      SELECT t.id, u.email, u.full_name
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ${tokenHash}
        AND t.used_at IS NULL
        AND t.expires_at > NOW()
      LIMIT 1
    `
  );
  const record = rows[0];
  if (!record) return { ok: false, code: "INVALID_RESET_TOKEN" };
  const code = sixDigitCode();
  const now = new Date();
  await withDbTimeout(
    prisma.$executeRaw`
      UPDATE password_reset_tokens
      SET code_hash = ${hashResetToken(code)}, attempts = 0, last_sent_at = ${now}
      WHERE id = ${record.id}
    `
  );
  return {
    ok: true,
    email: record.email,
    code,
    fullName: record.full_name ?? undefined,
  };
}
