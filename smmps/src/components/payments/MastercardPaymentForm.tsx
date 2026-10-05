"use client";

import { Lock } from "lucide-react";
import {
  formatCardExpiryInput,
  formatCardNumberInput,
  type MastercardFormValues,
} from "@/lib/mastercard-payment";
import { cn } from "@/lib/utils";

type Props = {
  lang: "en" | "so";
  amount: number;
  brand?: "mastercard" | "visa";
  values: MastercardFormValues;
  onChange: (next: MastercardFormValues) => void;
  error?: string;
  className?: string;
};

function displayNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  const last4 = digits.slice(-4);
  const shown = last4.padStart(4, "•");
  return `•••• •••• •••• ${shown}`;
}

export function MastercardPaymentForm({
  lang,
  brand = "mastercard",
  values,
  onChange,
  error,
  className,
}: Props) {
  const t = (en: string, so: string) => (lang === "so" ? so : en);
  const visa = brand === "visa";
  const holder = values.cardHolder.trim();
  const expiry = values.expiry.trim();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden px-4 pb-4 pt-3.5 text-white",
          visa ? "bg-[#1434CB]" : "bg-[#1a1f71]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              {visa
                ? t("Pay with your Visa", "Ku bixi Visa-gaaga")
                : t("Pay with your Mastercard", "Ku bixi Mastercard-kaaga")}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/90">
              {t("Enter your card details securely", "Geli macluumaadka kaarkaaga si ammaan ah")}
            </p>
          </div>
          {visa ? (
            <span
              className="shrink-0 font-black italic tracking-tight text-[#F7B600]"
              style={{ fontSize: 22, letterSpacing: "-0.04em" }}
              aria-label="Visa"
            >
              VISA
            </span>
          ) : (
            <svg
              viewBox="0 0 131.39 86.3"
              className="h-8 w-12 shrink-0"
              role="img"
              aria-label="Mastercard"
            >
              <circle cx="43.15" cy="43.15" r="43.15" fill="#EB001B" />
              <circle cx="88.24" cy="43.15" r="43.15" fill="#F79E1B" />
              <path
                fill="#FF5F00"
                d="M65.7 6.36a43.15 43.15 0 0 1 0 73.58 43.15 43.15 0 0 1 0-73.58z"
              />
            </svg>
          )}
        </div>

        <div className="mt-4">
          <span
            className="relative block h-7 w-9 overflow-hidden rounded-[4px] border border-amber-200/40 bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300"
            aria-hidden
          >
            <span className="absolute inset-x-0 top-1/2 h-px bg-amber-700/30" />
            <span className="absolute inset-y-0 left-1/2 w-px bg-amber-700/30" />
          </span>
        </div>

        <p className="mt-4 font-mono text-[17px] font-semibold tracking-[0.18em] text-white">
          {displayNumber(values.cardNumber)}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3 text-[11px]">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">
              {t("Card holder", "Mulkiilaha")}
            </p>
            <p className="truncate text-xs font-bold uppercase tracking-wide">
              {holder || t("Full name", "Magaca oo buuxa")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">
              {t("Expires", "Dhacaya")}
            </p>
            <p className="font-mono text-xs font-bold tracking-wide">{expiry || "MM/YY"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 bg-slate-50 px-3.5 py-3 text-slate-900">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("Name on card", "Magaca ku qoran kaarka")}
          </span>
          <input
            type="text"
            autoComplete="cc-name"
            value={values.cardHolder}
            onChange={(e) =>
              onChange({ ...values, cardHolder: e.target.value.slice(0, 80) })
            }
            placeholder={t("As shown on card", "Sida ku qoran kaarka")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold uppercase outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("Card number", "Lambarka kaarka")}
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={23}
            value={values.cardNumber}
            onChange={(e) =>
              onChange({
                ...values,
                cardNumber: formatCardNumberInput(e.target.value),
              })
            }
            placeholder={visa ? "4111 1111 1111 1111" : "5412 7512 3456 7890"}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold tracking-wider outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("Expiry (MM/YY)", "Dhicitaan (MM/YY)")}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              maxLength={5}
              value={values.expiry}
              onChange={(e) =>
                onChange({
                  ...values,
                  expiry: formatCardExpiryInput(e.target.value),
                })
              }
              placeholder="MM/YY"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              CVV
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={3}
              value={values.cvv}
              onChange={(e) =>
                onChange({
                  ...values,
                  cvv: e.target.value.replace(/\D/g, "").slice(0, 3),
                })
              }
              placeholder="123"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold tracking-widest outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
            />
          </label>
        </div>

        <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {t("Billing address", "Cinwaanka biilka")}
        </p>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("Street address", "Cinwaanka wadada")}
          </span>
          <input
            type="text"
            autoComplete="billing street-address"
            value={values.billingAddress}
            onChange={(e) =>
              onChange({ ...values, billingAddress: e.target.value.slice(0, 120) })
            }
            placeholder={t("123 Main Street", "123 Waddada Weyn")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("City", "Magaalada")}
            </span>
            <input
              type="text"
              autoComplete="billing address-level2"
              value={values.city}
              onChange={(e) => onChange({ ...values, city: e.target.value.slice(0, 60) })}
              placeholder={t("Mogadishu", "Muqdisho")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("State / region", "Gobolka")}
            </span>
            <input
              type="text"
              autoComplete="billing address-level1"
              value={values.state}
              onChange={(e) => onChange({ ...values, state: e.target.value.slice(0, 60) })}
              placeholder={t("Banaadir", "Banaadir")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("ZIP / postal code", "ZIP code")}
            </span>
            <input
              type="text"
              autoComplete="billing postal-code"
              maxLength={12}
              value={values.zipCode}
              onChange={(e) =>
                onChange({
                  ...values,
                  zipCode: e.target.value.replace(/[^A-Za-z0-9\s-]/g, "").slice(0, 12),
                })
              }
              placeholder="25201"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t("Country", "Dalka")}
            </span>
            <input
              type="text"
              name="card-country-manual"
              autoComplete="off"
              readOnly
              onFocus={(e) => {
                e.currentTarget.readOnly = false;
              }}
              value={values.country}
              onChange={(e) => onChange({ ...values, country: e.target.value.slice(0, 60) })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#1a1f71] focus:ring-2 focus:ring-[#1a1f71]/20"
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {t(
            "Full card number and CVV are not stored — only used to confirm this payment.",
            "Lambarka buuxa iyo CVV lama kaydiyo — kaliya xaqiijinta lacag-bixintan."
          )}
        </p>
      </div>
    </div>
  );
}
