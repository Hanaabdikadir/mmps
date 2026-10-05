import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Encrypt / decrypt the plaintext registration password so Super Admin can
 * review the real login password on Pending Approvals. Login still uses the
 * bcrypt hash on User.password — this field is for admin review only.
 */

const PREFIX = "v1:";

function keyFromSecret(): Buffer {
  const secret =
    process.env.JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "mmps-dev-secret";
  return createHash("sha256").update(`mmps-reg-pw:${secret}`).digest();
}

export function encryptRegistrationPassword(plain: string): string | null {
  const text = plain.trim();
  if (!text) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, enc]).toString("base64url")}`;
}

export function decryptRegistrationPassword(
  stored: string | null | undefined
): string | null {
  const raw = stored?.trim();
  if (!raw) return null;
  try {
    if (!raw.startsWith(PREFIX)) {
      // Legacy / plaintext fallback (should not be used for new rows)
      return raw || null;
    }
    const buf = Buffer.from(raw.slice(PREFIX.length), "base64url");
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return null;
  }
}
