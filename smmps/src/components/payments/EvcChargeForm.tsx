"use client";

import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type PaidResult = {
  phone: string;
  transactionId: string;
  referenceId: string;
  accountNo: string;
  amount: number;
  receiptToken: string;
};

type Props = {
  lang: "en" | "so";
  amount: number;
  description: string;
  planId?: number | null;
  merchantHintPhone?: string;
  paid: PaidResult | null;
  onPaid: (result: PaidResult) => void;
  onClear?: () => void;
  className?: string;
};

export function EvcChargeForm({
  lang,
  amount,
  description,
  planId,
  merchantHintPhone = "0619643334",
  paid,
  onPaid,
  onClear,
  className,
}: Props) {
  const [phone, setPhone] = useState(paid?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const t = (en: string, so: string) => (lang === "so" ? so : en);

  async function pay() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/payments/evc/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          amount,
          description,
          planId: planId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          String(data.error || "").trim() ||
            t("EVC payment failed.", "Lacag-dirista EVC waa fashilantay.")
        );
        return;
      }
      onPaid({
        phone,
        transactionId: String(data.transactionId || ""),
        referenceId: String(data.referenceId || ""),
        accountNo: String(data.accountNo || ""),
        amount: Number(data.amount) || amount,
        receiptToken: String(data.receiptToken || ""),
      });
    } catch {
      setError(
        t(
          "Network error. Check connection and try again.",
          "Khalad shabakadeed. Hubi internetka oo isku day mar kale."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  if (paid?.receiptToken) {
    return (
      <div
        className={cn(
          "rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-950",
          className
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
          {t("EVC payment received", "Lacagta EVC waa la helay")}
        </p>
        <p className="mt-1 text-sm font-extrabold">
          ${paid.amount.toFixed(2)} · {paid.phone}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-emerald-800/90">
          Tx: {paid.transactionId}
        </p>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-2 text-[11px] font-bold text-emerald-800 underline"
          >
            {t("Pay with a different number", "Ku bixi number kale")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-orange-50/60 p-3.5 text-xs text-amber-950 shadow-xs space-y-2.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              {t("Pay with EVC Plus", "Ku bixi EVC Plus")}
            </p>
            <p className="text-[11px] font-semibold text-amber-900/90">
              {t(
                "Enter your EVC number — approve the PIN on your phone",
                "Geli lambarkaaga EVC — PIN ka phone-kaaga ku ansixi"
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-amber-700">
            {t("Amount", "Qadarka")}
          </span>
          <p className="text-base font-black text-amber-900">${amount.toFixed(2)}</p>
        </div>
      </div>

      <label className="block">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
          }}
          placeholder="061xxxxxxx"
          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-amber-950 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/50"
        />
      </label>

      <p className="text-[11px] text-amber-900/85">
        {t(
          `Merchant account ${merchantHintPhone}. Money is charged from your EVC when you approve.`,
          `Akoonka ganacsiga ${merchantHintPhone}. Lacagta EVC-gaaga ayaa laga jarayaa markaad ansixiso.`
        )}
      </p>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || !phone.trim()}
        onClick={() => void pay()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
        {busy
          ? t("Waiting for PIN on your phone…", "Sug PIN-ka phone-kaaga…")
          : t("Send payment request", "Dir codsiga lacag-bixinta")}
      </button>
    </div>
  );
}
