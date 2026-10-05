"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, Shield, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { useLang } from "@/lib/language-context";
import { formatMmpsDayLabel, formatMmpsTime } from "@/lib/mogadishu-time";

export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  fromAdmin: boolean;
  sender: { id: number; fullName: string; role: string };
};

function formatTime(iso: string, lang: string) {
  return formatMmpsTime(iso, lang);
}

function formatDay(iso: string, lang: string) {
  return formatMmpsDayLabel(iso, lang);
}

function mergeMessages(prev: ChatMessage[], next: ChatMessage[]) {
  const map = new Map<number, ChatMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of next) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function RegistrationChatPanel({
  mode,
  threadUserId,
  currentUserId,
  applicantName,
  subtitle,
  className,
}: {
  mode: "applicant" | "admin";
  /** Required for admin mode */
  threadUserId?: number;
  currentUserId: number;
  applicantName?: string;
  subtitle?: string;
  className?: string;
}) {
  const { lang } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [bothTyping, setBothTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const lastTypingSent = useRef(0);

  const typingUrl =
    mode === "admin"
      ? "/api/super-admin/registration-messages/typing"
      : "/api/account/messages/typing";

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setError("");
      try {
        const url =
          mode === "admin"
            ? `/api/super-admin/registration-messages?userId=${threadUserId}`
            : "/api/account/messages";
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!silent) {
            setError(
              typeof json.error === "string"
                ? json.error
                : lang === "so"
                  ? "Fariimaha lama soo rarinin."
                  : "Could not load messages."
            );
          }
          return;
        }
        const next = Array.isArray(json.messages) ? json.messages : [];
        setMessages((prev) => mergeMessages(prev, next));
      } catch {
        if (!silent) {
          setError(
            lang === "so"
              ? "Fariimaha lama soo rarinin."
              : "Could not load messages."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [lang, mode, threadUserId]
  );

  const pollTyping = useCallback(async () => {
    try {
      const url =
        mode === "admin" ? `${typingUrl}?userId=${threadUserId}` : typingUrl;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setBothTyping(Boolean(json.bothTyping));
      setOtherTyping(Boolean(json.otherTyping));
    } catch {
      /* ignore */
    }
  }, [mode, threadUserId, typingUrl]);

  const notifyTyping = useCallback(
    async (typing: boolean) => {
      try {
        await fetch(typingUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "admin" ? { userId: threadUserId, typing } : { typing }
          ),
        });
      } catch {
        /* ignore */
      }
    },
    [mode, threadUserId, typingUrl]
  );

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    void load(false);
    const t = window.setInterval(() => void load(true), 3000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    void pollTyping();
    const t = window.setInterval(() => void pollTyping(), 1500);
    return () => window.clearInterval(t);
  }, [pollTyping]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      void notifyTyping(false);
    };
  }, [notifyTyping]);

  function onDraftChange(value: string) {
    setDraft(value);
    const now = Date.now();
    if (value.trim()) {
      if (now - lastTypingSent.current > 1200) {
        lastTypingSent.current = now;
        void notifyTyping(true);
      }
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => {
        void notifyTyping(false);
      }, 2800);
    } else {
      void notifyTyping(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    void notifyTyping(false);
    try {
      const res = await fetch(
        mode === "admin"
          ? "/api/super-admin/registration-messages"
          : "/api/account/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "admin" ? { userId: threadUserId, body } : { body }
          ),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : lang === "so"
              ? "Fariinta lama diri karin."
              : "Could not send message."
        );
        return;
      }
      setDraft("");
      if (json.message) {
        setMessages((prev) => mergeMessages(prev, [json.message as ChatMessage]));
      } else {
        await load(true);
      }
    } catch {
      setError(
        lang === "so" ? "Fariinta lama diri karin." : "Could not send message."
      );
    } finally {
      setSending(false);
    }
  }

  const rows = useMemo(() => {
    const out: Array<
      | { kind: "day"; key: string; label: string }
      | { kind: "msg"; key: string; message: ChatMessage }
    > = [];
    let lastDay = "";
    for (const m of messages) {
      const day = formatDay(m.createdAt, lang);
      if (day !== lastDay) {
        lastDay = day;
        out.push({ kind: "day", key: `day-${m.id}`, label: day });
      }
      out.push({ kind: "msg", key: `msg-${m.id}`, message: m });
    }
    return out;
  }, [lang, messages]);

  const otherName =
    mode === "admin"
      ? applicantName || (lang === "so" ? "Codsade" : "Applicant")
      : "admin";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]",
        mode === "applicant" && "min-h-[28rem]",
        className
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-20 shrink-0 border-b border-teal-800/20 bg-gradient-to-r from-[#00392b] via-teal-800 to-teal-700",
          mode === "applicant"
            ? "px-5 py-6 sm:px-6 sm:py-7"
            : "px-5 py-5 sm:px-6 sm:py-6"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-4",
            mode === "applicant" ? "min-h-[4.5rem]" : "min-h-[3.5rem]"
          )}
        >
          <div className="flex min-w-0 items-center gap-4">
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm",
                mode === "applicant" ? "h-14 w-14" : "h-12 w-12"
              )}
            >
              <MessageSquare
                className={mode === "applicant" ? "h-7 w-7" : "h-6 w-6"}
                strokeWidth={2.2}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                <StableBilingual en="Conversation" so="Wadahadal" lang={lang} />
              </p>
              <h2
                className={cn(
                  "mt-1 font-black tracking-tight text-white",
                  mode === "applicant"
                    ? "text-xl leading-snug sm:text-2xl"
                    : "truncate text-lg sm:text-xl"
                )}
              >
                {mode === "admin" ? (
                  <>
                    <StableBilingual en="Chat with" so="La hadal" lang={lang} />{" "}
                    {otherName}
                  </>
                ) : (
                  <StableBilingual
                    en="Messages with admin"
                    so="Fariimaha admin"
                    lang={lang}
                  />
                )}
              </h2>
              {subtitle ? (
                <p className="mt-1 truncate text-xs font-semibold text-emerald-100/90">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#31A24C] px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-[0_0_14px_rgba(49,162,76,0.55)]">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 animate-pulse-live rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]" />
            </span>
            Live
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#eef4f1]">
        <div
          className={cn(
            "min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5",
            mode === "applicant" ? "min-h-[16rem]" : "scrollbar-none"
          )}
        >
          {loading ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full min-h-[12rem] place-items-center">
              <p className="max-w-[16rem] rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
                <StableBilingual
                  en="No messages yet. Send the first message to start."
                  so="Weli fariimo ma jiraan. Dir fariinta ugu horreysa."
                  lang={lang}
                />
              </p>
            </div>
          ) : (
            rows.map((row) => {
              if (row.kind === "day") {
                return (
                  <div key={row.key} className="flex justify-center py-1">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                      {row.label}
                    </span>
                  </div>
                );
              }
              const m = row.message;
              const outgoing =
                mode === "admin"
                  ? m.fromAdmin
                  : m.sender.id === currentUserId;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "flex items-end gap-2",
                    outgoing ? "justify-end" : "justify-start"
                  )}
                >
                  {!outgoing ? (
                    <span
                      className={cn(
                        "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white",
                        m.fromAdmin
                          ? "bg-[#0f766e]"
                          : "bg-gradient-to-br from-sky-500 to-teal-600"
                      )}
                    >
                      {m.fromAdmin ? (
                        <Shield className="h-3.5 w-3.5" strokeWidth={2.4} />
                      ) : (
                        <UserRound className="h-3.5 w-3.5" strokeWidth={2.4} />
                      )}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "min-w-[13.5rem] w-fit max-w-[min(82%,28rem)] rounded-2xl px-3.5 py-2.5 shadow-sm",
                      outgoing
                        ? "rounded-br-md bg-[#0f766e] text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                    )}
                  >
                    <div className="flex items-end justify-between gap-3">
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wide",
                          outgoing ? "text-emerald-100" : "text-slate-400"
                        )}
                      >
                        {m.fromAdmin
                          ? lang === "so"
                            ? "Maamulaha"
                            : "Admin"
                          : m.sender.fullName}
                      </p>
                      <p
                        className={cn(
                          "shrink-0 text-[10px]",
                          outgoing ? "text-emerald-100/80" : "text-slate-400"
                        )}
                      >
                        {formatTime(m.createdAt, lang)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 whitespace-pre-wrap font-medium leading-relaxed",
                        mode === "applicant"
                          ? "text-base sm:text-[17px] sm:leading-7"
                          : "text-[15px]"
                      )}
                    >
                      {m.body}
                    </p>
                  </div>
                  {outgoing ? (
                    <span
                      className={cn(
                        "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white",
                        m.fromAdmin
                          ? "bg-[#0f766e]"
                          : "bg-gradient-to-br from-sky-500 to-teal-600"
                      )}
                    >
                      {m.fromAdmin ? (
                        <Shield className="h-3.5 w-3.5" strokeWidth={2.4} />
                      ) : (
                        <UserRound className="h-3.5 w-3.5" strokeWidth={2.4} />
                      )}
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
          {otherTyping && !bothTyping ? (
            <div className="flex justify-start gap-2">
              <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-emerald-100 ring-2 ring-white">
                {mode === "applicant" ? (
                  <Shield className="h-3.5 w-3.5" />
                ) : (
                  <UserRound className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200/80 bg-white px-3 py-3 sm:px-4">
          {error ? (
            <p className="mb-2 text-center text-xs font-semibold text-rose-600">
              {error}
            </p>
          ) : null}
          <div className="flex w-full items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={1}
              maxLength={2000}
              placeholder={
                lang === "so"
                  ? mode === "admin"
                    ? "Qor fariin…"
                    : "Qor fariin admin…"
                  : mode === "admin"
                    ? "Write a message…"
                    : "Write a message to admin…"
              }
              className="registration-chat-input min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-[#f8faf9] px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="button"
              disabled={sending || !draft.trim()}
              onClick={() => void send()}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-[#0f766e] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                <StableBilingual en="Send" so="Dir" lang={lang} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
