"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Droplets,
  Zap,
  Beef,
  ServerCog,
  Users,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  X,
} from "lucide-react";
import type { AdminNotification } from "@/lib/super-admin-service";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { ConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { LIVESTOCK_MARKET_LOGO } from "@/lib/livestock-data";
import { cn } from "@/lib/utils";
import { formatMmpsStamp } from "@/lib/mogadishu-time";
import { RegistrationChatPanel } from "@/components/auth/RegistrationChatPanel";

type Filter = "ALL" | "UNREAD" | "READ";
type SectorFilter = "ALL" | "water" | "electricity" | "livestock" | "system" | "users";

const SECTOR_META: Record<
  string,
  { icon: typeof Bell; tone: string; label: string; chip: string }
> = {
  water: {
    icon: Droplets,
    tone: "bg-blue-50 text-blue-600",
    label: "Water",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
  },
  electricity: {
    icon: Zap,
    tone: "bg-amber-50 text-amber-600",
    label: "Electricity",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  livestock: {
    icon: Beef,
    tone: "bg-emerald-50 text-emerald-600",
    label: "Livestock",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  users: {
    icon: Users,
    tone: "bg-violet-50 text-violet-600",
    label: "Users",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
  },
  system: {
    icon: ServerCog,
    tone: "bg-slate-100 text-slate-600",
    label: "System",
    chip: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const filterSelectClass =
  "h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200/90 bg-white pl-3.5 pr-8 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

function formatStamp(iso: string) {
  return formatMmpsStamp(iso);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function NotificationsPanel({
  initialNotifications,
  currentUserId,
}: {
  initialNotifications: AdminNotification[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Filter>("ALL");
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [chats, setChats] = useState<
    Array<{
      userId: number;
      name: string;
      email: string;
      marketLabel: string;
      lastMessage: string;
      lastAt: string;
      unread: number;
    }>
  >([]);
  const [openChat, setOpenChat] = useState<{
    userId: number;
    name: string;
    marketLabel: string;
  } | null>(null);

  function isBrokerChatNote(n: AdminNotification) {
    const type = n.type || "GENERAL";
    if (type === "DIRECT_CHAT") return true;
    return (
      n.sector.toLowerCase() === "livestock" &&
      type === "GENERAL" &&
      Boolean(n.senderId)
    );
  }

  useEffect(() => {
    setItems(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    void fetch("/api/super-admin/broker-chats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setChats(Array.isArray(d.threads) ? d.threads : []))
      .catch(() => setChats([]));
  }, [initialNotifications]);

  const counts = useMemo(() => {
    const unread = items.filter((n) => !n.read).length;
    return {
      total: items.length,
      unread,
      read: items.length - unread,
    };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (isBrokerChatNote(n)) return false;
      if (statusFilter === "UNREAD" && n.read) return false;
      if (statusFilter === "READ" && !n.read) return false;
      if (sectorFilter !== "ALL" && n.sector.toLowerCase() !== sectorFilter) {
        return false;
      }
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.sector.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter, sectorFilter]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function markRead(id: string, read = true) {
    setBusyId(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read } : n))
    );
    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read }),
      });
      if (!res.ok) throw new Error("failed");
      refresh();
    } catch {
      setItems(initialNotifications);
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setBusyId("all");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error("failed");
      refresh();
    } catch {
      setItems(initialNotifications);
    } finally {
      setBusyId(null);
    }
  }

  async function removeOne(id: string) {
    setBusyId(id);
    const prev = items;
    setItems((list) => list.filter((n) => n.id !== id));
    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("failed");
      refresh();
    } catch {
      setItems(prev);
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    setBusyId("clear");
    const prev = items;
    setItems([]);
    setConfirmClearOpen(false);
    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      if (!res.ok) throw new Error("failed");
      refresh();
    } catch {
      setItems(prev);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-3">
          <p className="text-[13px] font-black text-slate-800">
            Messages from brokers and companies
          </p>
        </div>
        {chats.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm font-semibold text-slate-400">
            No broker or company admin has sent a message yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {chats.map((t) => (
              <li key={t.userId}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenChat({
                      userId: t.userId,
                      name: t.name,
                      marketLabel: t.marketLabel,
                    })
                  }
                  className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-emerald-50/50"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{t.name}</span>
                      {t.unread > 0 ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                          {t.unread} new
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-bold text-emerald-800">
                      {t.marketLabel}
                    </span>
                    <span className="mt-1 block truncate text-sm text-slate-500">
                      {t.lastMessage}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid w-full grid-cols-3 gap-2 sm:gap-3">
        <KpiCard
          label="All"
          value={counts.total}
          hint="Notifications"
          icon={Bell}
          tone="indigo"
          onClick={() => setStatusFilter("ALL")}
        />
        <KpiCard
          label="Unread"
          value={counts.unread}
          hint="Needs attention"
          icon={BellRing}
          tone="amber"
          onClick={() => setStatusFilter("UNREAD")}
        />
        <KpiCard
          label="Read"
          value={counts.read}
          hint="Already seen"
          icon={CheckCheck}
          tone="teal"
          onClick={() => setStatusFilter("READ")}
        />
      </div>

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3  ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setQuery(searchDraft.trim());
                }}
                placeholder="SEARCH"
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setQuery(searchDraft.trim())}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>

          <div className="relative w-full sm:w-[9.5rem] shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Filter)}
              className={filterSelectClass}
              aria-label="Filter by status"
            >
              <option value="ALL">All status</option>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>

          <div className="relative w-full sm:w-[10rem] shrink-0">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value as SectorFilter)}
              className={filterSelectClass}
              aria-label="Filter by sector"
            >
              <option value="ALL">All sectors</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="livestock">Livestock</option>
              <option value="users">Users</option>
              <option value="system">System</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              style={{ right: 5 }}
              strokeWidth={2.25}
            />
          </div>

          <button
            type="button"
            disabled={busyId === "all" || counts.unread === 0}
            onClick={() => void markAllRead()}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-[13px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      </div>

      <section
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white  transition-opacity",
          pending && "opacity-70"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-black text-slate-900">Inbox</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              {visible.length} notification{visible.length === 1 ? "" : "s"} shown
            </p>
          </div>
          <button
            type="button"
            disabled={items.length === 0 || busyId === "clear"}
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm font-semibold text-slate-400">
            No notifications yet. New registrations, approvals, and price updates
            will appear here.
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {visible.map((n) => {
              const meta = SECTOR_META[n.sector.toLowerCase()] ?? SECTOR_META.system;
              const Icon = meta.icon;
              const rowBusy = busyId === n.id;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition",
                    !n.read ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-slate-50/70"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
                      n.sector.toLowerCase() === "livestock"
                        ? "border border-slate-200 bg-white p-1 shadow-sm"
                        : meta.tone
                    )}
                  >
                    {n.sector.toLowerCase() === "livestock" ? (
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={LIVESTOCK_MARKET_LOGO}
                          alt=""
                          className="h-full w-full object-contain object-center"
                        />
                      </span>
                    ) : (
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-900">{n.title}</p>
                      {!n.read && (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                          New
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                          meta.chip
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-snug text-slate-500">
                      {n.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
                      <span>{relativeTime(n.createdAt)}</span>
                      <span className="text-slate-300">·</span>
                      <span>{formatStamp(n.createdAt)}</span>
                      {n.href && (
                        <>
                          <span className="text-slate-300">·</span>
                          <Link
                            href={n.href}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      title={n.read ? "Mark unread" : "Mark read"}
                      disabled={rowBusy}
                      onClick={() => void markRead(n.id, !n.read)}
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-xl border transition disabled:opacity-50",
                        n.read
                          ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      )}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      disabled={rowBusy}
                      onClick={() => void removeOne(n.id)}
                      className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear all notifications?"
        description={`This will permanently remove ${items.length} notification${items.length === 1 ? "" : "s"} from your inbox. This action cannot be undone.`}
        confirmLabel="Clear all"
        cancelLabel="Keep inbox"
        tone="danger"
        busy={busyId === "clear"}
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => void clearAll()}
      />
      {openChat && currentUserId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center">
          <div className="flex h-[min(88vh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <p className="text-xs font-bold text-slate-500">Private reply</p>
              <button
                type="button"
                onClick={() => {
                  setOpenChat(null);
                  refresh();
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <RegistrationChatPanel
              mode="admin"
              threadUserId={openChat.userId}
              currentUserId={currentUserId}
              applicantName={openChat.name}
              subtitle={openChat.marketLabel}
              className="h-full min-h-0 rounded-none border-0 shadow-none"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
