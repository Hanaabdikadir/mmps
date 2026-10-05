import "server-only";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import { createNotification, notifyRole } from "@/lib/notifications";

export type ChatMessageDto = {
  id: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  fromAdmin: boolean;
  sender: {
    id: number;
    fullName: string;
    role: string;
  };
};

function toDto(row: {
  id: number;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  senderId: number;
  threadUserId: number;
  sender: { id: number; fullName: string; role: string };
}): ChatMessageDto {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    fromAdmin: row.senderId !== row.threadUserId,
    sender: {
      id: row.sender.id,
      fullName: row.sender.fullName,
      role: String(row.sender.role),
    },
  };
}

const WELCOME_PREFIX = "Thank you for registering with MMPS";

function isLivestockElectricityOrWater(input: {
  companySector?: string | null;
  companyType?: string | null;
}): boolean {
  const blob = `${input.companySector || ""} ${input.companyType || ""}`.toLowerCase();
  return (
    blob.includes("livestock") ||
    blob.includes("camel") ||
    blob.includes("cattle") ||
    blob.includes("sheep") ||
    blob.includes("goat") ||
    blob.includes("geel") ||
    blob.includes("loda") ||
    blob.includes("arri") ||
    blob.includes("electric") ||
    blob.includes("water")
  );
}

function welcomeBodyForApplicant(input: {
  companySector?: string | null;
  companyType?: string | null;
}): string {
  const blob = `${input.companySector || ""} ${input.companyType || ""}`.toLowerCase();
  if (
    blob.includes("livestock") ||
    blob.includes("camel") ||
    blob.includes("cattle") ||
    blob.includes("sheep") ||
    blob.includes("goat") ||
    blob.includes("geel") ||
    blob.includes("loda") ||
    blob.includes("arri")
  ) {
    return `${WELCOME_PREFIX}. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.`;
  }
  if (blob.includes("electric")) {
    return `${WELCOME_PREFIX}. Your electricity supply application is under review. We will reply here when we need more information or when a decision is ready.`;
  }
  return `${WELCOME_PREFIX}. Your water supply application is under review. We will reply here when we need more information or when a decision is ready.`;
}

export async function listThreadMessages(
  threadUserId: number,
  opts?: { skipWelcome?: boolean; hideWelcome?: boolean }
) {
  if (!opts?.skipWelcome) {
    await ensureWelcomeMessage(threadUserId);
  }
  const rows = await withDbTimeout(
    prisma.registrationMessage.findMany({
      where: { threadUserId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    })
  );
  const visible = opts?.hideWelcome
    ? rows.filter((row) => !row.body.trim().startsWith(WELCOME_PREFIX))
    : rows;
  return visible.map(toDto);
}

/** Keep at most one auto-welcome note. */
async function dedupeWelcomeMessages(threadUserId: number) {
  const extras = await withDbTimeout(
    prisma.registrationMessage.findMany({
      where: { threadUserId },
      orderBy: { id: "asc" },
      select: { id: true, body: true },
    })
  );
  const welcomeIds = extras
    .filter((row) => row.body.trim().startsWith(WELCOME_PREFIX))
    .map((row) => row.id);
  if (welcomeIds.length <= 1) return;
  await withDbTimeout(
    prisma.registrationMessage.deleteMany({
      where: { id: { in: welcomeIds.slice(1) } },
    })
  );
}

async function findWelcomeSenderId(threadUserId: number): Promise<number | null> {
  const admin = await withDbTimeout(
    prisma.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
        deletedAt: null,
        id: { not: threadUserId },
      },
      orderBy: { id: "asc" },
      select: { id: true },
    })
  );
  return admin?.id ?? null;
}

/** One automatic first message for livestock, electricity, and water applicants. */
export async function ensureWelcomeMessage(threadUserId: number) {
  await dedupeWelcomeMessages(threadUserId);
  const existing = await withDbTimeout(
    prisma.registrationMessage.findFirst({
      where: {
        threadUserId,
        body: { startsWith: WELCOME_PREFIX },
      },
      select: { id: true },
    })
  );
  if (existing) return;

  const applicant = await withDbTimeout(
    prisma.user.findFirst({
      where: { id: threadUserId, deletedAt: null },
      select: {
        companySector: true,
        companyType: true,
        role: true,
        brokerId: true,
        status: true,
      },
    })
  );
  if (applicant?.status && applicant.status !== "PENDING") {
    return;
  }
  if (
    applicant?.role === "LIVESTOCK_BROKER_USER" ||
    applicant?.brokerId
  ) {
    return;
  }
  if (
    applicant?.role === "COMPANY_ADMIN" ||
    applicant?.role === "SUPER_ADMIN"
  ) {
    return;
  }
  if (
    !isLivestockElectricityOrWater({
      companySector: applicant?.companySector,
      companyType: applicant?.companyType,
    })
  ) {
    return;
  }

  const senderId = await findWelcomeSenderId(threadUserId);
  if (!senderId) return;

  const body = welcomeBodyForApplicant({
    companySector: applicant?.companySector,
    companyType: applicant?.companyType,
  });

  await withDbTimeout(
    prisma.registrationMessage.create({
      data: {
        threadUserId,
        senderId,
        body,
      },
    })
  );
}

export async function postThreadMessage(opts: {
  threadUserId: number;
  senderId: number;
  body: string;
}) {
  const body = opts.body.trim();
  if (body.length < 1 || body.length > 2000) {
    throw new Error("Message must be 1–2000 characters");
  }
  const row = await withDbTimeout(
    prisma.registrationMessage.create({
      data: {
        threadUserId: opts.threadUserId,
        senderId: opts.senderId,
        body,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    })
  );

  const preview = body.length > 180 ? `${body.slice(0, 177)}…` : body;
  const { livestockBrokerChatMeta } = await import("@/lib/livestock-broker-chat");
  const brokerMeta = await livestockBrokerChatMeta(opts.threadUserId);
  const threadUser = await withDbTimeout(
    prisma.user.findFirst({
      where: { id: opts.threadUserId, deletedAt: null },
      select: { fullName: true, companyName: true, companySector: true, role: true },
    })
  );
  const companyLabel =
    threadUser?.companyName?.trim() ||
    threadUser?.companySector?.trim() ||
    "Company";
  const isCompanyAdmin = threadUser?.role === "COMPANY_ADMIN";

  // Super Admin → applicant / broker / company
  if (opts.senderId !== opts.threadUserId) {
    await createNotification({
      userId: opts.threadUserId,
      title: brokerMeta?.isBroker || isCompanyAdmin
        ? "Jawaab admin"
        : "New message from admin",
      message: preview,
      type: "GENERAL",
      sector: brokerMeta?.isBroker
        ? "livestock"
        : isCompanyAdmin
          ? String(threadUser?.companySector || "water").toLowerCase()
          : "account",
      senderId: opts.senderId,
    }).catch(() => null);
  } else if (brokerMeta?.isBroker) {
    await notifyRole(["SUPER_ADMIN"], {
      title: brokerMeta.name,
      message: `${brokerMeta.marketLabel}\n\n${preview}`,
      type: "GENERAL",
      sector: "livestock",
      senderId: opts.senderId,
    }).catch(() => null);
  } else if (isCompanyAdmin) {
    await notifyRole(["SUPER_ADMIN"], {
      title: threadUser?.fullName || "Company admin",
      message: `${companyLabel}\n\n${preview}`,
      type: "GENERAL",
      sector: String(threadUser?.companySector || "water").toLowerCase(),
      senderId: opts.senderId,
    }).catch(() => null);
  } else {
    await notifyRole(["SUPER_ADMIN"], {
      title: "New message from applicant",
      message: preview,
      type: "GENERAL",
      sector: "account",
      senderId: opts.senderId,
    }).catch(() => null);
  }

  return toDto(row);
}

export async function markThreadReadForViewer(opts: {
  threadUserId: number;
  viewerId: number;
}) {
  // Mark messages from the other party as read
  await withDbTimeout(
    prisma.registrationMessage.updateMany({
      where: {
        threadUserId: opts.threadUserId,
        senderId: { not: opts.viewerId },
        readAt: null,
      },
      data: { readAt: new Date() },
    })
  );
}

export async function countUnreadForApplicant(threadUserId: number) {
  return withDbTimeout(
    prisma.registrationMessage.count({
      where: {
        threadUserId,
        senderId: { not: threadUserId },
        readAt: null,
      },
    })
  );
}
