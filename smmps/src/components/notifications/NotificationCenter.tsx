"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, Trash2, Send, MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatMmpsStamp } from "@/lib/mogadishu-time";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { useLang, TRANSLATIONS } from "@/lib/language-context";

import { RegistrationChatPanel } from "@/components/auth/RegistrationChatPanel";
import { BrokerRejectedPricesFix } from "@/components/broker/BrokerRejectedPricesFix";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export function NotificationCenter({
  canSend = false,
  canMessageSuperAdmin = false,
  showRejectedPrices = false,
  brokerFixHref,
  currentUserId,
}: {
  canSend?: boolean;
  canMessageSuperAdmin?: boolean;
  showRejectedPrices?: boolean;
  brokerFixHref?: string;
  currentUserId?: number;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ title: "", message: "", audience: "all" });
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { lang } = useLang();
  const B = TRANSLATIONS.brokerPortal;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread ?? (data.notifications || []).filter((n: Notification) => !n.read).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: number) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    await load();
  }

  async function remove(id: number) {
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function clearAll() {
    await fetch("/api/notifications?all=1", { method: "DELETE" });
    await load();
  }

  async function send() {
    setSending(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      setSendOpen(false);
      setSendForm({ title: "", message: "", audience: "all" });
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {canMessageSuperAdmin && currentUserId ? (
        <>
          {showRejectedPrices ? <BrokerRejectedPricesFix /> : null}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="mb-2 text-[12px] font-semibold text-slate-600">
              {B.chatHint[lang]}
            </p>
            <button
              type="button"
              onClick={() => setChatOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0a5240] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#083f31]"
            >
              <MessageSquare className="h-4 w-4" />
              {chatOpen ? B.close[lang] : B.chat[lang]}
            </button>
            {chatOpen ? (
              <div className="mt-3">
                <RegistrationChatPanel
                  mode="applicant"
                  currentUserId={currentUserId}
                  className="max-h-[36rem]"
                />
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">{B.notifications[lang]}</h2>
          <p className="text-sm text-slate-500">{unread} {B.unread[lang]}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <CheckCheck className="h-3.5 w-3.5" /> {B.markAllRead[lang]}
          </button>
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={!items.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" /> {B.clearAll[lang]}
          </button>
          {canSend && (
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a5240] px-3 py-2 text-xs font-bold text-white hover:bg-[#083f31]"
            >
              <Send className="h-3.5 w-3.5" /> Send announcement
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
            <p className="p-6 text-sm text-slate-500">{B.loading[lang]}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Bell className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">{B.noNotifications[lang]}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className={cn("flex items-start justify-between gap-3 p-4", !n.read && "bg-blue-50/40")}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{n.message}</p>
                  {brokerFixHref && n.type === "PRICE_REJECTED" ? (
                    <Link
                      href={brokerFixHref}
                      className="mt-2 inline-flex text-[12px] font-bold text-emerald-700 hover:underline"
                    >
                      {B.fixAndResubmit[lang]}
                    </Link>
                  ) : null}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {n.type.replace(/_/g, " ")} · {formatMmpsStamp(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Mark read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send Announcement"
        footer={
          <>
            <button type="button" onClick={() => setSendOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Cancel
            </button>
            <button type="button" onClick={send} disabled={sending} className="rounded-lg bg-[#0a5240] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              {sending ? "Sending..." : "Send"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <input className={inputCls} value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })} />
          </Field>
          <Field label="Message">
            <textarea className={inputCls} rows={4} value={sendForm.message} onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} />
          </Field>
          <Field label="Audience">
            <select className={inputCls} value={sendForm.audience} onChange={(e) => setSendForm({ ...sendForm, audience: e.target.value })}>
              <option value="all">All users</option>
              <option value="companies">Companies</option>
              <option value="brokers">Livestock Brokers</option>
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
