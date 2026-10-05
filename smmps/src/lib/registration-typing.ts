import "server-only";

/** In-memory typing presence for registration chat (single-server). */
const TYPING_TTL_MS = 4000;
const typingUntil = new Map<string, number>();

function key(threadUserId: number, userId: number) {
  return `${threadUserId}:${userId}`;
}

function prune(now = Date.now()) {
  for (const [k, until] of typingUntil) {
    if (until <= now) typingUntil.delete(k);
  }
}

export function markTyping(threadUserId: number, userId: number) {
  const now = Date.now();
  prune(now);
  typingUntil.set(key(threadUserId, userId), now + TYPING_TTL_MS);
}

export function clearTyping(threadUserId: number, userId: number) {
  typingUntil.delete(key(threadUserId, userId));
}

export function getTypingPresence(opts: {
  threadUserId: number;
  viewerId: number;
}) {
  const now = Date.now();
  prune(now);
  const applicantId = opts.threadUserId;
  const applicantTyping =
    (typingUntil.get(key(opts.threadUserId, applicantId)) ?? 0) > now;

  // Any non-applicant typer on this thread counts as admin typing
  let adminTyping = false;
  for (const [k, until] of typingUntil) {
    if (until <= now) continue;
    if (!k.startsWith(`${opts.threadUserId}:`)) continue;
    const uid = Number(k.split(":")[1]);
    if (uid !== applicantId) {
      adminTyping = true;
      break;
    }
  }

  const otherTyping =
    opts.viewerId === applicantId ? adminTyping : applicantTyping;

  return {
    applicantTyping,
    adminTyping,
    otherTyping,
    bothTyping: applicantTyping && adminTyping,
  };
}
