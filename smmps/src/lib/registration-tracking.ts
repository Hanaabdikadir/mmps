import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { naiveTimestampOffsetMs, shiftIso } from "@/lib/mogadishu-time";

export type RegistrationTimelineEventType =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCUMENTS_REVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "REASON_UPDATED";

export type RegistrationRejectionInfo = {
  reason: string | null;
  rejectedAt: string | null;
  rejectedById: number | null;
  rejectedByName: string | null;
};

export type RegistrationTimelineItem = {
  id: string;
  eventType: string;
  title: string;
  detail: string | null;
  statusLabel: string | null;
  actorLabel: string | null;
  createdAt: string;
};

export type RejectionHistoryItem = {
  id: number;
  previousReason: string | null;
  newReason: string;
  changedByName: string;
  createdAt: string;
};

export async function addRegistrationTimelineEvent(input: {
  userId: number;
  eventType: RegistrationTimelineEventType | string;
  title: string;
  detail?: string | null;
  statusLabel?: string | null;
  actorId?: number | null;
  actorLabel?: string | null;
  visibleToApplicant?: boolean;
  at?: Date;
}): Promise<void> {
  const at = input.at ?? new Date();
  try {
    await prisma.$executeRaw`
      INSERT INTO registration_timeline_events
        (user_id, event_type, title, detail, status_label, actor_id, actor_label, visible_to_applicant, created_at)
      VALUES (
        ${input.userId},
        ${input.eventType},
        ${input.title},
        ${input.detail ?? null},
        ${input.statusLabel ?? null},
        ${input.actorId ?? null},
        ${input.actorLabel ?? null},
        ${input.visibleToApplicant !== false},
        ${at}
      )
    `;
  } catch (err) {
    console.error("[registration-tracking] timeline insert failed", err);
  }
}

export async function rejectRegistrationApplication(input: {
  userId: number;
  reason: string;
  rejectedById: number;
  rejectedByName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "Rejection reason is required" };

  const now = new Date();
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET
        status = 'REJECTED'::"UserStatus",
        rejection_reason = ${reason},
        rejected_at = ${now},
        rejected_by_id = ${input.rejectedById},
        updated_at = ${now}
      WHERE id = ${input.userId} AND deleted_at IS NULL
    `;

    await prisma.$executeRaw`
      INSERT INTO registration_rejection_history
        (user_id, previous_reason, new_reason, changed_by_id, created_at)
      VALUES (${input.userId}, NULL, ${reason}, ${input.rejectedById}, ${now})
    `;

    await addRegistrationTimelineEvent({
      userId: input.userId,
      eventType: "REJECTED",
      title: "Application rejected",
      detail: reason,
      statusLabel: "Rejected",
      actorId: input.rejectedById,
      actorLabel: "MMPS Administration",
      at: now,
    });

    return { ok: true };
  } catch (err) {
    console.error("[registration-tracking] reject failed", err);
    return { ok: false, error: "Could not reject application" };
  }
}

export async function updateRegistrationRejectionReason(input: {
  userId: number;
  newReason: string;
  changedById: number;
  changedByName: string;
}): Promise<{ ok: true; previousReason: string | null } | { ok: false; error: string }> {
  const newReason = input.newReason.trim();
  if (!newReason) return { ok: false, error: "Rejection reason is required" };

  try {
    const rows = await prisma.$queryRaw<
      Array<{ rejection_reason: string | null; status: string }>
    >`
      SELECT rejection_reason, status::text AS status
      FROM users
      WHERE id = ${input.userId} AND deleted_at IS NULL
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { ok: false, error: "Applicant not found" };
    if (String(row.status).toUpperCase() !== "REJECTED") {
      return { ok: false, error: "Only rejected applications have a rejection reason" };
    }

    const previous = row.rejection_reason?.trim() || null;
    if (previous === newReason) {
      return { ok: true, previousReason: previous };
    }

    const now = new Date();
    await prisma.$executeRaw`
      UPDATE users
      SET rejection_reason = ${newReason}, updated_at = ${now}
      WHERE id = ${input.userId}
    `;

    await prisma.$executeRaw`
      INSERT INTO registration_rejection_history
        (user_id, previous_reason, new_reason, changed_by_id, created_at)
      VALUES (${input.userId}, ${previous}, ${newReason}, ${input.changedById}, ${now})
    `;

    await addRegistrationTimelineEvent({
      userId: input.userId,
      eventType: "REASON_UPDATED",
      title: "Rejection reason updated",
      detail: newReason,
      statusLabel: "Rejected",
      actorId: input.changedById,
      actorLabel: "MMPS Administration",
      at: now,
    });

    return { ok: true, previousReason: previous };
  } catch (err) {
    console.error("[registration-tracking] update reason failed", err);
    return { ok: false, error: "Could not update rejection reason" };
  }
}

export async function getRegistrationRejectionInfo(
  userId: number
): Promise<RegistrationRejectionInfo> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        rejection_reason: string | null;
        rejected_at: Date | null;
        rejected_by_id: number | null;
        rejected_by_name: string | null;
      }>
    >`
      SELECT
        u.rejection_reason,
        u.rejected_at,
        u.rejected_by_id,
        rb.full_name AS rejected_by_name
      FROM users u
      LEFT JOIN users rb ON rb.id = u.rejected_by_id
      WHERE u.id = ${userId}
      LIMIT 1
    `;
    const row = rows[0];
    return {
      reason: row?.rejection_reason?.trim() || null,
      rejectedAt: row?.rejected_at ? row.rejected_at.toISOString() : null,
      rejectedById: row?.rejected_by_id ?? null,
      rejectedByName: row?.rejected_by_name?.trim() || null,
    };
  } catch {
    return {
      reason: null,
      rejectedAt: null,
      rejectedById: null,
      rejectedByName: null,
    };
  }
}

export async function listRejectionReasonHistory(
  userId: number
): Promise<RejectionHistoryItem[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        previous_reason: string | null;
        new_reason: string;
        changed_by_name: string | null;
        created_at: Date;
      }>
    >`
      SELECT
        h.id,
        h.previous_reason,
        h.new_reason,
        u.full_name AS changed_by_name,
        h.created_at
      FROM registration_rejection_history h
      LEFT JOIN users u ON u.id = h.changed_by_id
      WHERE h.user_id = ${userId}
      ORDER BY h.created_at ASC, h.id ASC
    `;
    return rows.map((r) => ({
      id: r.id,
      previousReason: r.previous_reason,
      newReason: r.new_reason,
      changedByName: r.changed_by_name?.trim() || "Super Admin",
      createdAt: r.created_at.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function listRegistrationTimelineForApplicant(
  userId: number
): Promise<RegistrationTimelineItem[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        event_type: string;
        title: string;
        detail: string | null;
        status_label: string | null;
        actor_label: string | null;
        created_at: Date;
      }>
    >`
      SELECT id, event_type, title, detail, status_label, actor_label, created_at
      FROM registration_timeline_events
      WHERE user_id = ${userId} AND visible_to_applicant = TRUE
      ORDER BY created_at ASC, id ASC
    `;
    return rows.map((r) => ({
      id: String(r.id),
      eventType: r.event_type,
      title: r.title,
      detail: r.detail,
      statusLabel: r.status_label,
      actorLabel: r.actor_label,
      createdAt: r.created_at.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Baseline + stored events so the applicant always sees a complete progress history. */
export async function ensureBaselineTimeline(input: {
  userId: number;
  submittedAt: Date;
  documentsReviewedAt?: Date | null;
  status: string;
  rejection?: RegistrationRejectionInfo | null;
}): Promise<RegistrationTimelineItem[]> {
  const existing = await listRegistrationTimelineForApplicant(input.userId);
  const submittedMs = input.submittedAt.getTime();
  const submittedIso = input.submittedAt.toISOString();
  const originalSubmitted = existing.find(
    (e) => e.eventType.toUpperCase() === "SUBMITTED"
  );
  const naiveOffset = naiveTimestampOffsetMs(
    originalSubmitted?.createdAt,
    input.submittedAt
  );

  const merged: RegistrationTimelineItem[] = existing.map((row) => ({
    ...row,
    createdAt: shiftIso(row.createdAt, naiveOffset),
  }));

  if (input.documentsReviewedAt) {
    for (const row of merged) {
      if (row.eventType.toUpperCase() === "SUBMITTED") continue;
      const extra = naiveTimestampOffsetMs(
        row.createdAt,
        input.documentsReviewedAt
      );
      if (extra) row.createdAt = shiftIso(row.createdAt, extra);
    }
  }
  const byType = new Set(merged.map((e) => e.eventType.toUpperCase()));

  const pushIfMissing = (item: RegistrationTimelineItem) => {
    if (byType.has(item.eventType.toUpperCase())) return;
    byType.add(item.eventType.toUpperCase());
    merged.push(item);
  };

  const submittedRow = merged.find(
    (e) => e.eventType.toUpperCase() === "SUBMITTED"
  );
  if (submittedRow) {
    submittedRow.createdAt = submittedIso;
  } else {
    merged.push({
      id: "synth-submitted",
      eventType: "SUBMITTED",
      title: "Application submitted",
      detail: null,
      statusLabel: "Submitted",
      actorLabel: null,
      createdAt: submittedIso,
    });
    byType.add("SUBMITTED");
  }

  const underReview = merged.find(
    (e) => e.eventType.toUpperCase() === "UNDER_REVIEW"
  );
  if (underReview) {
    const t = new Date(underReview.createdAt).getTime();
    if (Number.isFinite(t) && t - submittedMs >= 0 && t - submittedMs < 5 * 60_000) {
      underReview.createdAt = new Date(submittedMs + 1000).toISOString();
    }
  }

  if (input.documentsReviewedAt) {
    pushIfMissing({
      id: "synth-docs",
      eventType: "DOCUMENTS_REVIEWED",
      title: "Documents reviewed",
      detail: null,
      statusLabel: "Documents Verified",
      actorLabel: "MMPS Administration",
      createdAt: shiftIso(
        input.documentsReviewedAt.toISOString(),
        naiveOffset
      ),
    });
  }

  const status = input.status.toUpperCase();
  if (status === "APPROVED") {
    pushIfMissing({
      id: "synth-approved",
      eventType: "APPROVED",
      title: "Application approved",
      detail: null,
      statusLabel: "Approved",
      actorLabel: "MMPS Administration",
      createdAt: new Date().toISOString(),
    });
  } else if (status === "REJECTED") {
    pushIfMissing({
      id: "synth-rejected",
      eventType: "REJECTED",
      title: "Application rejected",
      detail: input.rejection?.reason || null,
      statusLabel: "Rejected",
      actorLabel: "MMPS Administration",
      createdAt: input.rejection?.rejectedAt || new Date().toISOString(),
    });
  }

  return merged.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      String(a.id).localeCompare(String(b.id))
  );
}

export async function recordDocumentsReviewedTimeline(
  userId: number,
  actorId?: number | null
): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n
      FROM registration_timeline_events
      WHERE user_id = ${userId} AND event_type = 'DOCUMENTS_REVIEWED'
    `;
    if ((rows[0]?.n ?? 0) > 0) return;
  } catch {
    /* continue and try insert */
  }

  await addRegistrationTimelineEvent({
    userId,
    eventType: "DOCUMENTS_REVIEWED",
    title: "Documents reviewed",
    detail: null,
    statusLabel: "Documents Verified",
    actorId: actorId ?? null,
    actorLabel: "MMPS Administration",
  });
}

export async function loadRejectionMapForUserIds(
  userIds: number[]
): Promise<
  Map<
    number,
    { reason: string | null; rejectedAt: string | null; rejectedByName: string | null }
  >
> {
  const map = new Map<
    number,
    { reason: string | null; rejectedAt: string | null; rejectedByName: string | null }
  >();
  const unique = [...new Set(userIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!unique.length) return map;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        rejection_reason: string | null;
        rejected_at: Date | null;
        rejected_by_name: string | null;
      }>
    >`
      SELECT
        u.id,
        u.rejection_reason,
        u.rejected_at,
        rb.full_name AS rejected_by_name
      FROM users u
      LEFT JOIN users rb ON rb.id = u.rejected_by_id
      WHERE u.id IN (${Prisma.join(unique)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        reason: row.rejection_reason?.trim() || null,
        rejectedAt: row.rejected_at ? row.rejected_at.toISOString() : null,
        rejectedByName: row.rejected_by_name?.trim() || null,
      });
    }
  } catch {
    /* column may be unavailable briefly */
  }
  return map;
}
