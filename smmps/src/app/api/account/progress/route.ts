import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import {
  getCurrentUser,
  getRequestUserAgent,
  signToken,
  setAuthCookie,
  ADMIN_AUTH_MAX_AGE_SEC,
  type AuthUser,
} from "@/lib/auth";
import { authPortalForRole } from "@/lib/auth-portal";
import { createAdminSession } from "@/lib/admin-session-store";
import { countUnreadForApplicant } from "@/lib/registration-messages";
import {
  activateApprovedApplicant,
  portalRedirectForRole,
} from "@/lib/activate-approved-applicant";
import { getDocumentsReviewedAt } from "@/lib/documents-reviewed";
import {
  ensureBaselineTimeline,
  getRegistrationRejectionInfo,
} from "@/lib/registration-tracking";
import { SHARED_SECTOR_DOCUMENTS } from "@/lib/registration-requirements";
import { getDocumentReviews } from "@/lib/registration-document-reviews";
import {
  formatBrokerManagedAccounts,
  isLivestockBrokerRegistration,
  livestockSectionTitle,
  livestockSpeciesLabel,
} from "@/lib/register-flow";
import {
  formatRegistrationMarketsLabel,
  professionalLivestockMarketLabel,
} from "@/lib/livestock-registration-markets";
import { registrationMarketIds } from "@/lib/subscriptions";

export type ProgressDoc = {
  id: string;
  label: string;
  fileName: string;
  state: "submitted" | "under_review" | "accepted" | "rejected" | "missing";
  rejectReason?: string | null;
  reuploaded?: boolean;
  uploadedAt?: string | null;
};

function uploadedAtFromFileName(fileName: string): string | null {
  const base = fileName.split(/[/\\]/).pop() || fileName;
  const m = base.match(/^(\d{12,13})[-_]/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1_000_000_000_000) return null;
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type ProgressStep = {
  id: string;
  state: "done" | "current" | "upcoming" | "failed";
};

async function livestockTrackFields(user: {
  companyType?: string | null;
  companySector?: string | null;
  companyName?: string | null;
  companyLocation?: string | null;
  companyAddress?: string | null;
  registrationDocuments?: string | null;
  contactRole?: string | null;
  role?: string | null;
  market?: { name: string; location: string | null } | null;
}) {
  const isBroker = isLivestockBrokerRegistration({
    contactRole: user.contactRole,
    companyType: user.companyType,
    companySector: user.companySector,
    role: user.role,
  });

  if (!isBroker) {
    return {
      applicantKind: "company" as const,
      livestockSection: null as string | null,
      marketName: null as string | null,
    };
  }

  const livestockSection =
    formatBrokerManagedAccounts({ rawTypes: user.companyType }) ||
    livestockSectionTitle(
      livestockSpeciesLabel(
        user.companyType,
        user.companySector,
        user.companyName
      )
    );

  const docs = parseDocs(user.registrationDocuments);
  let rawMarkets = docs.market_names?.trim() || "";

  if (!rawMarkets) {
    const ids = registrationMarketIds(user.registrationDocuments);
    if (ids.length > 0) {
      try {
        const markets = await prisma.market.findMany({
          where: { id: { in: ids }, deletedAt: null },
          select: { id: true, name: true },
        });
        const byId = new Map(markets.map((m) => [m.id, m.name]));
        rawMarkets = ids
          .map((id) => byId.get(id)?.trim())
          .filter(Boolean)
          .join(", ");
      } catch {
        rawMarkets = "";
      }
    }
  }

  // Prefer multi-market registration data over the single user.market FK.
  if (!rawMarkets) {
    rawMarkets =
      user.companyAddress?.trim() ||
      user.companyLocation?.trim() ||
      user.market?.name?.trim() ||
      "";
  }

  const marketName =
    formatRegistrationMarketsLabel(rawMarkets) ||
    professionalLivestockMarketLabel(user.market?.name) ||
    null;

  return {
    applicantKind: "broker" as const,
    livestockSection,
    marketName,
  };
}

function parseDocs(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

const REGISTRATION_TEXT_FIELDS = new Set([
  "plan_id",
  "plan_price",
  "plan_duration_days",
  "plan_name",
  "plan_sector",
  "plan_max_markets",
  "plan_max_livestock_types",
  "pay_months",
  "market_ids",
  "market_names",
]);

function selectedPlanFromDocs(docs: Record<string, string>) {
  const id = Number(docs.plan_id);
  const name = docs.plan_name?.trim() || "";
  if (!name && !(Number.isFinite(id) && id > 0)) return null;
  const priceRaw = docs.plan_price?.trim() || "";
  const daysRaw = docs.plan_duration_days?.trim() || "";
  const price = priceRaw === "" ? null : Number(priceRaw);
  const durationDays = daysRaw === "" ? null : Number(daysRaw);
  return {
    id: Number.isFinite(id) && id > 0 ? id : null,
    name: name || (Number.isFinite(id) && id > 0 ? `Plan #${id}` : ""),
    price: price != null && Number.isFinite(price) ? price : null,
    durationDays:
      durationDays != null && Number.isFinite(durationDays)
        ? durationDays
        : null,
    accountType: docs.plan_sector?.trim() || null,
    payMonths: (() => {
      const months = Number(docs.pay_months);
      return Number.isFinite(months) && months >= 1 ? Math.round(months) : null;
    })(),
  };
}

function isUploadedFile(value: string) {
  const base = value.split(/[/\\]/).pop() || value;
  return /\.[a-z0-9]{2,5}$/i.test(base);
}

function labelForDocId(id: string): string {
  const slot = SHARED_SECTOR_DOCUMENTS.find((d) => d.id === id);
  if (slot) return slot.label;
  return id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDocumentList(
  docs: Record<string, string>,
  status: string,
  verification: string,
  reviews: Awaited<ReturnType<typeof getDocumentReviews>>
): ProgressDoc[] {
  const s = status.toUpperCase();
  const v = verification.toUpperCase();
  const planPrice = Number(docs.plan_price ?? NaN);
  const isFreePlan =
    Number.isFinite(planPrice) &&
    planPrice <= 0 &&
    Boolean(docs.plan_id || docs.plan_name);
  const slotIds = SHARED_SECTOR_DOCUMENTS.map((d) => d.id).filter(
    (id) => !(isFreePlan && id === "payment_receipt")
  );
  const ids = new Set<string>([
    ...slotIds,
    ...Object.keys(docs).filter(
      (id) =>
        !REGISTRATION_TEXT_FIELDS.has(id) &&
        !(isFreePlan && id === "payment_receipt") &&
        isUploadedFile(docs[id] || "")
    ),
  ]);

  return [...ids].map((id) => {
    const fileName = docs[id] || "";
    const review = reviews[id];
    let state: ProgressDoc["state"] = fileName ? "submitted" : "missing";
    if (!fileName) {
      state = "missing";
    } else if (review?.status === "REJECTED") {
      state = "rejected";
    } else if (review?.status === "ACCEPTED") {
      state = "accepted";
    } else if (review?.reuploaded || review?.status === "PENDING") {
      state = "under_review";
    } else if (s === "APPROVED") {
      state = "accepted";
    } else if (v === "UNDER_REVIEW" || v === "VERIFIED") {
      state = "under_review";
    }
    return {
      id,
      label: labelForDocId(id),
      fileName: fileName || "Not uploaded",
      state,
      rejectReason: review?.status === "REJECTED" ? review.reason : null,
      reuploaded: review?.reuploaded === true,
      uploadedAt:
        review?.replacedAt ||
        (fileName ? uploadedAtFromFileName(fileName) : null),
    };
  });
}

function buildSteps(
  status: string,
  verification: string,
  hasDocuments: boolean,
  documentsComplete: boolean
): ProgressStep[] {
  const s = status.toUpperCase();
  const v = verification.toUpperCase();
  const docsDone = documentsComplete || v === "VERIFIED";

  if (s === "APPROVED") {
    return [
      { id: "submitted", state: "done" },
      { id: "received", state: "done" },
      { id: "documents", state: "done" },
      { id: "decision", state: "done" },
    ];
  }

  if (s === "REJECTED") {
    return [
      { id: "submitted", state: "done" },
      { id: "received", state: "done" },
      { id: "documents", state: docsDone ? "done" : "failed" },
      { id: "decision", state: "failed" },
    ];
  }

  if (!hasDocuments) {
    return [
      { id: "submitted", state: "done" },
      { id: "received", state: "current" },
      { id: "documents", state: "upcoming" },
      { id: "decision", state: "upcoming" },
    ];
  }

  if (docsDone) {
    return [
      { id: "submitted", state: "done" },
      { id: "received", state: "done" },
      { id: "documents", state: "done" },
      { id: "decision", state: "current" },
    ];
  }

  return [
    { id: "submitted", state: "done" },
    { id: "received", state: "done" },
    { id: "documents", state: "current" },
    { id: "decision", state: "upcoming" },
  ];
}

export async function GET() {
  try {
    const session = await getCurrentUser("user");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.email.toLowerCase().trim();
    const user = await withDbTimeout(
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          fullName: true,
          status: true,
          role: true,
          companyId: true,
          brokerId: true,
          companySlug: true,
          companyLocation: true,
          companyAddress: true,
          companyName: true,
          companyType: true,
          companySector: true,
          companyDistrict: true,
          contactRole: true,
          registrationDocuments: true,
          documentFileName: true,
          createdAt: true,
          verificationCode: { select: { verified: true } },
          market: { select: { id: true, name: true, location: true } },
        },
      })
    );
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const documentsReviewedAt = await getDocumentsReviewedAt(user.id);

    let portalRole = user.role;
    let portalRedirect: string | null = null;
    let companyId = user.companyId;
    let brokerId = user.brokerId;
    let companySlug = user.companySlug;

    const livestockApplicant = isLivestockBrokerRegistration({
      contactRole: user.contactRole,
      companyType: user.companyType,
      companySector: user.companySector,
      role: user.role,
    });
    const livestockPortalFallback = livestockApplicant ? "/broker" : "/login";

    if (String(user.status).toUpperCase() === "APPROVED") {
      const activated = await activateApprovedApplicant({
        userId: user.id,
        email,
      });
      if (activated.role) portalRole = activated.role;
      portalRedirect =
        activated.redirectTo ||
        portalRedirectForRole(portalRole, email) ||
        livestockPortalFallback;

      if (activated.activated || session.role !== portalRole) {
        const fresh = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            companyId: true,
            brokerId: true,
            companySlug: true,
          },
        });
        if (fresh) {
          portalRole = fresh.role;
          companyId = fresh.companyId;
          brokerId = fresh.brokerId;
          companySlug = fresh.companySlug;
          portalRedirect =
            portalRedirectForRole(portalRole, email) ||
            portalRedirect ||
            livestockPortalFallback;
        }
      }

      // Refresh cookie so Track → livestock dashboard uses the new broker role.
      if (
        portalRedirect &&
        portalRole &&
        portalRole !== "REGISTERED" &&
        portalRole !== "PUBLIC"
      ) {
        try {
          let authUser: AuthUser = {
            id: user.id,
            fullName: user.fullName,
            email,
            role: portalRole,
            status: user.status,
            companyId,
            brokerId,
            companySlug,
          };
          const privileged =
            portalRole === "SUPER_ADMIN" || portalRole === "COMPANY_ADMIN";
          if (privileged) {
            const adminSession = await createAdminSession({
              userId: user.id,
              role: portalRole,
              userAgent: await getRequestUserAgent(),
            });
            authUser = { ...authUser, sid: adminSession.sid };
          }
          const token = signToken(authUser);
          await setAuthCookie(
            token,
            privileged ? ADMIN_AUTH_MAX_AGE_SEC : undefined,
            authPortalForRole(authUser.role)
          );
        } catch (err) {
          console.error("[account/progress] session refresh failed", err);
        }
      }

      // Never return track-dashboard payload for approved users.
      const approvedTrack = await livestockTrackFields(user);
      const approvedDocs = parseDocs(user.registrationDocuments);
      return NextResponse.json({
        user: {
          id: session.id,
          fullName: user.fullName,
          email,
          status: "APPROVED",
          role: portalRole,
        },
        portalRedirect: portalRedirect || livestockPortalFallback,
        companyName: user.companyName,
        companyType: user.companyType,
        companyDistrict: user.companyDistrict ?? null,
        companyAddress: user.companyAddress ?? null,
        sector: user.companySector,
        ...approvedTrack,
        selectedPlan: selectedPlanFromDocs(approvedDocs),
        verification: "VERIFIED",
        submittedAt: user.createdAt.toISOString(),
        rejectionNote: null,
        documents: [],
        steps: [],
        unreadMessages: 0,
        unreadNotifications: 0,
      });
    }

    const fullName = user.fullName;
    const status = String(user.status).toUpperCase();
    const companyName = user.companyName;
    const companyType = user.companyType;
    const sector = user.companySector;
    // Documents step DONE only after Super Admin reviews uploads (or final decision).
    let verification = documentsReviewedAt ? "VERIFIED" : "NOT_VERIFIED";
    let docsMap: Record<string, string> = {};
    const submittedAt = user.createdAt.toISOString();

    docsMap = parseDocs(user.registrationDocuments);
    if (!Object.keys(docsMap).length && user.documentFileName) {
      docsMap = { document: user.documentFileName };
    }

    const rejectionInfo = await getRegistrationRejectionInfo(user.id);
    let rejectionNote: string | null = null;
    if (status === "REJECTED") {
      rejectionNote =
        rejectionInfo.reason ||
        "Your registration was not approved. You may sign in to review details and submit a new application.";
    }

    if (status === "APPROVED") verification = "VERIFIED";
    else if (status === "PENDING" && verification === "NOT_VERIFIED") {
      // Submitted docs imply under review until Super Admin opens them
      if (Object.keys(docsMap).length > 0) verification = "UNDER_REVIEW";
    }

    const documentReviews = await getDocumentReviews(user.id);
    const documents = buildDocumentList(
      docsMap,
      status,
      verification,
      documentReviews
    );
    const allDocsAccepted = SHARED_SECTOR_DOCUMENTS.every(
      (slot) => documentReviews[slot.id]?.status === "ACCEPTED"
    );
    const documentsComplete = Boolean(documentsReviewedAt) || allDocsAccepted;
    const steps = buildSteps(
      status,
      verification,
      Object.keys(docsMap).length > 0,
      documentsComplete
    );
    // If any individual document is rejected, keep documents step active
    const hasRejectedDocs = documents.some((d) => d.state === "rejected");
    const adjustedSteps =
      status === "PENDING" && hasRejectedDocs
        ? steps.map((step) =>
            step.id === "documents"
              ? { ...step, state: "current" as const }
              : step.id === "decision"
                ? { ...step, state: "upcoming" as const }
                : step
          )
        : steps;
    const timeline = await ensureBaselineTimeline({
      userId: user.id,
      submittedAt: user.createdAt,
      documentsReviewedAt,
      status,
      rejection: rejectionInfo,
    });
    const canReplaceDocuments =
      status === "REJECTED" ||
      status === "PENDING" ||
      hasRejectedDocs;
    const replaceableDocumentIds = documents
      .filter((d) => d.state === "rejected" || d.state === "missing")
      .map((d) => d.id);
    let unreadMessages = 0;
    let unreadNotifications = 0;
    try {
      unreadMessages = await countUnreadForApplicant(session.id);
    } catch {
      unreadMessages = 0;
    }
    try {
      unreadNotifications = await prisma.notification.count({
        where: { userId: session.id, read: false },
      });
    } catch {
      unreadNotifications = 0;
    }

    const trackFields = await livestockTrackFields(user);
    const selectedPlan = selectedPlanFromDocs(docsMap);

    return NextResponse.json({
      user: {
        id: session.id,
        fullName,
        email,
        status,
        role: portalRole,
      },
      portalRedirect,
      companyName,
      companyType,
      companyDistrict: user.companyDistrict ?? null,
      companyAddress: user.companyAddress ?? null,
      sector,
      ...trackFields,
      selectedPlan,
      verification,
      submittedAt,
      rejectionNote,
      rejection: status === "REJECTED"
        ? {
            reason: rejectionInfo.reason,
            rejectedAt: rejectionInfo.rejectedAt,
            // Applicant-facing label only — no internal admin identity
            rejectedBy: rejectionInfo.rejectedAt
              ? "MMPS Administration"
              : null,
          }
        : null,
      timeline,
      canReplaceDocuments,
      replaceableDocumentIds,
      requiredDocumentSlots: SHARED_SECTOR_DOCUMENTS.map((d) => ({
        id: d.id,
        label: d.label,
        labelSo: d.labelSo || d.label,
        description: d.description || null,
        descriptionSo: d.descriptionSo || null,
      })),
      documents,
      steps: adjustedSteps,
      unreadMessages,
      unreadNotifications,
    });
  } catch (error) {
    console.error("[account/progress]", error);
    return NextResponse.json(
      { error: "Account progress service is temporarily unavailable" },
      { status: 503 }
    );
  }
}
