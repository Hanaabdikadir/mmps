import "server-only";

export function isSupabaseRecoveryConfigured(): boolean {
  return false;
}

export async function verifySupabaseRecoveryOtp(_input: {
  email: string;
  code: string;
}): Promise<{ ok: false } | { ok: true; expiresAt: Date }> {
  return { ok: false };
}
