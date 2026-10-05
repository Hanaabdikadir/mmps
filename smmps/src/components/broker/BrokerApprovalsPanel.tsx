"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { publicSeasonLabelEn, publicSeasonLabelSo } from "@/lib/livestock-section-prices";
import { useLang } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type PendingPrice = {
  id: number;
  animalType: string;
  category: string | null;
  description: string | null;
  price: string;
  currency: string;
  marketLocation: string;
  createdAt: string;
  rejectionReason?: string | null;
  brokerName?: string | null;
  updatedByName?: string | null;
};

function seasonKey(category: string | null | undefined): "" | "Birimo" | "Sugunto" {
  const raw = (category || "").toUpperCase();
  if (raw.includes("BIRIMO")) return "Birimo";
  if (raw.includes("SUGUNTO")) return "Sugunto";
  return "";
}

function livestockName(p: PendingPrice): string {
  if (p.description?.trim()) return p.description.trim();
  const raw = (p.category || "").toUpperCase();
  const match = raw.match(/^FIELD_(?:BIRIMO|SUGUNTO)_(.+)$/);
  if (match) {
    return match[1]
      .split("_")
      .filter(Boolean)
      .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
      .join(" ");
  }
  if (raw === "BIRIMO_MALE" || raw === "SUGUNTO_MALE") return "Lab";
  if (raw === "BIRIMO_FEMALE" || raw === "SUGUNTO_FEMALE") return "Dhedig";
  return p.animalType;
}

export function BrokerApprovalsPanel() {
  const { lang, t } = useLang();
  const { confirm, dialog } = useConfirmDialog();

  const [prices, setPrices] = useState<PendingPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/broker/approvals/livestock-prices", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPrices(data.prices || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function handlePrice(p: PendingPrice, action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      const r = window.prompt(t("Rejection reason (required):", "Sababta diidmada (waa qasab):"));
      if (!r?.trim()) return;
      reason = r;
    }

    const ok = await confirm({
      title: action === "approve" ? t("Approve price?", "Aqbal qiimaha?") : t("Reject price?", "Diid qiimaha?"),
      description:
        action === "approve"
          ? t("This price will go live on the public home page.", "Qiimahani wuxuu ka muuqan doonaa bogga dadweynaha.")
          : t("This submission will be marked as rejected.", "Gudbintan waxaa loo calaamadin doonaa mid la diiday."),
      confirmLabel: action === "approve" ? t("Approve", "Aqbal") : t("Reject", "Diid"),
      tone: action === "approve" ? "primary" : "danger",
    });
    if (!ok) return;

    const res = await fetch("/api/livestock-prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, action, reason }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || t("Action failed", "Ficilku wuu fashilmay") });
      return;
    }
    setMessage({
      type: "ok",
      text: action === "approve" ? t("Price approved.", "Qiimaha waa la aqbalay.") : t("Price rejected.", "Qiimaha waa la diiday."),
    });
    await load();
  }

  return (
    <>
      {dialog}

      <div className="mx-auto flex h-[600px] w-[700px] max-w-full max-h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <ClipboardCheck className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-black leading-tight text-slate-900 sm:text-[15px]">
                {t("Pending Price Approvals", "Ansixinta qiimaha sugaya")}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500 sm:text-[12px]">
                {t("Every new livestock submission awaiting your review", "Qiimo kasta oo xoolo ah oo sugaya dib-u-eegistaada")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold",
                prices.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              )}
            >
              {prices.length > 0 ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {prices.length > 0
                ? t(`${prices.length} pending`, `${prices.length} sugaya`)
                : t("All clear", "Dhammaan waa la eegay")}
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50 sm:h-9 sm:px-3 sm:text-[12px]"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                strokeWidth={2.25}
              />
              {t("Refresh", "Cusbooneysii")}
            </button>
          </div>
        </div>

        {/* ── Message bar ── */}
        {message && (
          <div
            className={cn(
              "flex items-center gap-2 border-b px-5 py-2.5 text-[13px] font-semibold",
              message.type === "ok"
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-rose-100 bg-rose-50 text-rose-700"
            )}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading && prices.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-slate-400">
              {t("Loading submissions…", "Waa la soo dejinayaa…")}
            </p>
          </div>
        ) : prices.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
              <ShieldCheck className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-bold text-slate-500">
              {t("No pending price submissions", "Qiimo sugaya ma jiro")}
            </p>
            <p className="text-xs text-slate-400">
              {t("All livestock prices have been reviewed. Check back later.", "Dhammaan qiimaha xoolaha waa la eegay. Mar dambe soo noqo.")}
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {prices.map((p, i) => {
              const name = livestockName(p);
              const season = seasonKey(p.category);
              const seasonText = season
                ? lang === "so"
                  ? publicSeasonLabelSo(season)
                  : publicSeasonLabelEn(season)
                : "";
              return (
                <div
                  key={p.id}
                  className={cn(
                    "space-y-3 px-4 py-3.5 transition-colors hover:bg-slate-50/70 sm:px-5 sm:py-4",
                    i % 2 === 1 && "bg-slate-50/40"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black uppercase",
                        season === "Birimo"
                          ? "bg-amber-100 text-amber-800"
                          : season === "Sugunto"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-orange-100 text-orange-800"
                      )}
                    >
                      {seasonText ? seasonText.slice(0, 3) : p.animalType.slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {name}
                        </p>
                        {season ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold",
                              season === "Birimo"
                                ? "border-amber-200 bg-amber-50 text-amber-900"
                                : "border-sky-200 bg-sky-50 text-sky-900"
                            )}
                          >
                            {seasonText}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {p.updatedByName || p.brokerName || "—"} ·{" "}
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-extrabold text-slate-900">
                        {p.price}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {p.currency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePrice(p, "approve")}
                      className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.97] sm:h-9 sm:flex-none sm:px-3.5 sm:text-[12px]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("Approve", "Aqbal")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePrice(p, "reject")}
                      className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/80 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 active:scale-[0.97] sm:h-9 sm:flex-none sm:px-3.5 sm:text-[12px]"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("Reject", "Diid")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
