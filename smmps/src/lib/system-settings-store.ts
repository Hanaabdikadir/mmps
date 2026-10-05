import { unstable_cache } from "next/cache";
import { SYSTEM_NAME, MMPS_SUPPORT_EMAIL } from "@/lib/home-content";
import { prisma } from "@/lib/prisma";

export type SystemSettingsRecord = {
  systemName: string;
  supportEmail: string;
};

const DEFAULTS: SystemSettingsRecord = {
  systemName: SYSTEM_NAME,
  supportEmail: MMPS_SUPPORT_EMAIL,
};

export async function getSystemSettings(): Promise<SystemSettingsRecord> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ["systemName", "supportEmail"] } },
    select: { key: true, value: true },
  });
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value.trim()]));
  return {
    systemName: values.systemName || DEFAULTS.systemName,
    supportEmail: (values.supportEmail || DEFAULTS.supportEmail).toLowerCase(),
  };
}

export async function getEffectiveSystemName(): Promise<string> {
  return (await getSystemSettings()).systemName;
}

export async function getEffectiveSupportEmail(): Promise<string> {
  return (await getSystemSettings()).supportEmail;
}

async function getEffectiveSupportEmailSafe(): Promise<string> {
  try {
    return await getEffectiveSupportEmail();
  } catch {
    return DEFAULTS.supportEmail;
  }
}

// Netlify/OpenNext can break Next's data cache; keep a plain fallback there.
export const getEffectiveSupportEmailCached =
  process.env.NETLIFY === "true"
    ? getEffectiveSupportEmailSafe
    : unstable_cache(getEffectiveSupportEmailSafe, ["effective-support-email"], {
        revalidate: 60,
      });

export async function saveSystemSettings(input: {
  systemName?: string;
  supportEmail?: string;
}): Promise<SystemSettingsRecord> {
  const current = await getSystemSettings();
  const next: SystemSettingsRecord = {
    systemName:
      typeof input.systemName === "string" && input.systemName.trim()
        ? input.systemName.trim()
        : current.systemName,
    supportEmail:
      typeof input.supportEmail === "string" && input.supportEmail.trim()
        ? input.supportEmail.trim().toLowerCase()
        : current.supportEmail,
  };
  await prisma.$transaction(
    Object.entries(next).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
  return next;
}
