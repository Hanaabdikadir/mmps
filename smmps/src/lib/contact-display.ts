/** Treat missing / demo seed phones as empty so Super Admin lists stay DB-real. */
export function isPlaceholderPhone(value?: string | null): boolean {
  const raw = (value ?? "").trim();
  if (!raw || raw === "—" || raw === "-" || raw === "N/A" || raw === "n/a") {
    return true;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return true;
  if (/^0+$/.test(digits.slice(-7))) return true;
  return false;
}

export function realPhone(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (!isPlaceholderPhone(candidate)) return String(candidate).trim();
  }
  return "—";
}

export function realEmail(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const value = candidate?.trim() ?? "";
    if (value && value !== "—") return value;
  }
  return "—";
}
