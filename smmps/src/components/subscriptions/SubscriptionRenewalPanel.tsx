"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Minus, Plus, Smartphone } from "lucide-react";
import { authPortalHeaders, type AuthPortal } from "@/lib/auth-portal";
import { useLang } from "@/lib/language-context";
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_PHONE_NUMBER,
  livestockScopeLabels,
  parsePaidMonths,
  paymentMethodLabel,
  planCardOrder,
  planColorName,
  planDurationChoiceLabel,
  planInstallmentAmount,
  planMonthSpan,
  planMonthlyRateLabel,
  publicPlanName,
  type PaymentMethodId,
} from "@/lib/pricing-plans";
import {
  toMastercardSafePayload,
  validateMastercardForm,
  EMPTY_MASTERCARD_FORM,
  type MastercardFormValues,
} from "@/lib/mastercard-payment";
import { MastercardPaymentForm } from "@/components/payments/MastercardPaymentForm";
import { EvcChargeForm } from "@/components/payments/EvcChargeForm";
import { cn } from "@/lib/utils";

type RenewalPlan = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  durationDays: number;
  maxMarkets?: number | null;
  maxLivestockTypes?: number | null;
};

type RenewalPayload = {
  phone?: string;
  accountName?: string;
  plans?: RenewalPlan[];
  subscription: {
    status: string;
    expiryDate: string;
    plan: { id?: number; name: string; price: string; durationDays: number };
    adsRemaining: number | null;
  } | null;
  proof: {
    id: number;
    status: string;
    receiptFile: string;
    paymentMethod: PaymentMethodId | null;
    requestedPlanId?: number | null;
    requestedPlan?: {
      id: number;
      name: string;
      price: string;
      durationDays: number;
      maxMarkets?: number | null;
      maxLivestockTypes?: number | null;
    } | null;
    createdAt: string;
  } | null;
};

const EMPTY_CARD: MastercardFormValues = EMPTY_MASTERCARD_FORM;

type EvcPaid = {
  phone: string;
  transactionId: string;
  referenceId: string;
  accountNo: string;
  amount: number;
  receiptToken: string;
};

export function SubscriptionRenewalPanel({ portal }: { portal: AuthPortal }) {
  const { lang } = useLang();
  const [data, setData] = useState<RenewalPayload | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [payMonthsByPlan, setPayMonthsByPlan] = useState<Record<number, number>>({});
  const [mastercardForm, setMastercardForm] = useState<MastercardFormValues>(EMPTY_CARD);
  const [evcPaid, setEvcPaid] = useState<EvcPaid | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/account/subscription-renewal", {
      cache: "no-store",
      credentials: "include",
      headers: authPortalHeaders(portal),
    });
    if (!res.ok) return;
    const body = (await res.json()) as RenewalPayload;
    setData(body);
    setNow(Date.now());
    const requestedId = body.proof?.requestedPlanId ?? body.proof?.requestedPlan?.id ?? null;
    const currentId = body.subscription?.plan?.id ?? null;
    const plans = body.plans ?? [];
    const preferred =
      (requestedId && plans.find((p) => p.id === requestedId)?.id) ||
      requestedId ||
      (currentId && plans.find((p) => p.id === currentId)?.id) ||
      plans[0]?.id ||
      currentId;
    setSelectedPlanId(preferred ?? null);
  }

  useEffect(() => {
    void load();
  }, [portal]);

  const plans = [...(data?.plans ?? [])].sort(
    (a, b) => planCardOrder(a) - planCardOrder(b) || a.id - b.id
  );
  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  if (!data?.subscription) return null;
  const expired =
    data.subscription.status === "EXPIRED" ||
    (now !== null && new Date(data.subscription.expiryDate).getTime() < now);
  const adsUsedUp =
    data.subscription.adsRemaining != null && data.subscription.adsRemaining <= 0;
  const pending = data.proof?.status === "PENDING";
  if (!expired && !adsUsedUp && !pending) return null;

  const pendingPlan =
    data.proof?.requestedPlan ||
    (data.proof?.requestedPlanId
      ? plans.find((p) => p.id === data.proof?.requestedPlanId) || null
      : null) ||
    selectedPlan;
  const pendingMonths = parsePaidMonths(data.proof?.receiptFile);
  const pendingFullPrice = Number(
    pendingPlan?.price ?? data.subscription.plan.price
  );
  const pendingPrice =
    pendingPlan && pendingMonths && pendingFullPrice > 0
      ? planInstallmentAmount(
          pendingFullPrice,
          pendingPlan.durationDays,
          pendingMonths
        )
      : pendingFullPrice;
  const pendingPlanLabel = publicPlanName(
    pendingPlan?.name || data.subscription.plan.name,
    lang
  );
  const payMonths = selectedPlan
    ? Math.min(
        planMonthSpan(selectedPlan.durationDays),
        Math.max(1, payMonthsByPlan[selectedPlan.id] || 1)
      )
    : 1;
  const fullPrice = Number(selectedPlan?.price ?? data.subscription.plan.price);
  const price =
    selectedPlan && fullPrice > 0
      ? planInstallmentAmount(fullPrice, selectedPlan.durationDays, payMonths)
      : fullPrice;
  const isFree = Number.isFinite(price) && price <= 0;
  const phoneHint = data.phone || PAYMENT_PHONE_NUMBER;
  const planLabel = publicPlanName(
    selectedPlan?.name || data.subscription.plan.name,
    lang
  );

  async function submit() {
    if (!selectedPlanId) {
      setError(
        lang === "so" ? "Dooro plan." : "Choose a plan."
      );
      return;
    }
    if (!isFree && !paymentMethod) {
      setError(
        lang === "so"
          ? "Dooro EVC, MasterCard, ama Visa."
          : "Choose EVC, MasterCard, or Visa."
      );
      return;
    }
    let cardPayload: ReturnType<typeof toMastercardSafePayload> = null;
    if (!isFree && (paymentMethod === "mastercard" || paymentMethod === "visa")) {
      const cardErr = validateMastercardForm(
        mastercardForm,
        lang,
        paymentMethod === "visa" ? "visa" : "mastercard"
      );
      if (cardErr) {
        setError(cardErr);
        return;
      }
      cardPayload = toMastercardSafePayload(
        mastercardForm,
        paymentMethod === "visa" ? "visa" : "mastercard"
      );
      if (!cardPayload) {
        setError(
          lang === "so"
            ? paymentMethod === "visa"
              ? "Macluumaadka Visa sax ma aha."
              : "Macluumaadka MasterCard sax ma aha."
            : paymentMethod === "visa"
              ? "Visa details are invalid."
              : "MasterCard details are invalid."
        );
        return;
      }
    }
    if (!isFree && paymentMethod === "evc" && !evcPaid?.receiptToken) {
      setError(
        lang === "so"
          ? "Marka hore ku bixi EVC (ansixi PIN-ka phone-ka)."
          : "Complete EVC payment first (approve PIN on your phone)."
      );
      return;
    }
    if (
      !isFree &&
      paymentMethod === "evc" &&
      evcPaid &&
      Math.abs(evcPaid.amount - price) > 0.009
    ) {
      setError(
        lang === "so"
          ? "Lacagta EVC ma dhigma plan-ka aad dooratay. Dooro mar kale."
          : "EVC amount does not match the selected plan. Pay again."
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/subscription-renewal", {
        method: "POST",
        credentials: "include",
        headers: {
          ...authPortalHeaders(portal),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          ...(isFree ? {} : { paymentMethod, payMonths }),
          ...(cardPayload
            ? {
                cardHolder: cardPayload.cardHolder,
                cardLast4: cardPayload.cardLast4,
                cardExpiry: cardPayload.cardExpiry,
              }
            : {}),
          ...(evcPaid && paymentMethod === "evc"
            ? {
                evcTransactionId: evcPaid.transactionId,
                evcReferenceId: evcPaid.referenceId,
                evcAccountNo: evcPaid.accountNo,
                evcAmount: evcPaid.amount,
                evcReceiptToken: evcPaid.receiptToken,
              }
            : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          body.error ||
            (lang === "so" ? "Lama dirin." : "Could not submit payment notice.")
        );
        return;
      }
      setMastercardForm(EMPTY_CARD);
      setEvcPaid(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <CreditCard className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-amber-800">
            {pending
              ? lang === "so"
                ? "Codsiga waa la diray"
                : "Request submitted"
              : lang === "so"
                ? "Lacag-bixinta mar kale"
                : "Pay again"}
          </p>
          {pending ? (
            <>
              <p className="mt-1 text-sm font-semibold text-amber-950">
                {pendingPlanLabel}
                {Number.isFinite(pendingPrice)
                  ? ` · ${
                      pendingPrice <= 0
                        ? lang === "so"
                          ? "Bilaash"
                          : "Free"
                        : `$${pendingPrice.toFixed(2)}`
                    }`
                  : ""}
                {pendingMonths
                  ? ` · ${pendingMonths} ${
                      lang === "so"
                        ? "bil"
                        : pendingMonths === 1
                          ? "month"
                          : "months"
                    }`
                  : pendingPlan?.durationDays
                    ? ` · ${planDurationChoiceLabel(
                        pendingPlan.durationDays,
                        lang,
                        pendingFullPrice <= 0
                      )}`
                    : ""}
              </p>
              {pendingPlan ? (
                <ul className="mt-1.5 space-y-0.5 text-xs font-semibold text-amber-900/90">
                  {livestockScopeLabels(pendingPlan, lang).map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 space-y-1.5 rounded-xl border border-amber-200 bg-white/90 px-3 py-2.5 text-sm text-amber-950">
                <p className="font-semibold">
                  {lang === "so" ? "Habka lacag-bixinta: " : "Payment method: "}
                  <span className="font-black">
                    {paymentMethodLabel(data.proof?.paymentMethod, lang) ||
                      (lang === "so" ? "Lama kaydin" : "Not recorded")}
                  </span>
                </p>
                <p className="text-xs font-medium text-amber-900/90">
                  {lang === "so"
                    ? "Codsigaaga waa la diray Super Admin. Markuu ansixiyo, plan-kan ayaa akoonkaaga ku furmi doona."
                    : "Your request was sent to Super Admin. When approved, this plan will be activated on your account."}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-amber-950">
                {lang === "so"
                  ? "Dooro plan cusub, kadib bixi"
                  : "Choose a plan, then pay"}
                {selectedPlan ? ` · ${planLabel} · $${price.toFixed(2)}` : null}
              </p>
              <p className="mt-1 text-sm text-amber-900">
                {lang === "so"
                  ? "Plan-kii hore wuu dhacay — dooro mid kale haddii aad rabto."
                  : "Your previous plan ended — pick the same or a different plan."}
              </p>
            </>
          )}
        </div>
      </div>

      {!pending ? (
        <div className="mt-3 space-y-3">
          {plans.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
                {lang === "so" ? "Dooro plan" : "Choose plan"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {plans.map((plan) => {
                  const on = selectedPlanId === plan.id;
                  const p = Number(plan.price);
                  const maxMonths = planMonthSpan(plan.durationDays);
                  const months = Math.min(maxMonths, Math.max(1, payMonthsByPlan[plan.id] || 1));
                  const due = p <= 0 ? 0 : planInstallmentAmount(p, plan.durationDays, months);
                  return (
                    <div
                      key={plan.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setEvcPaid(null);
                        setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          (e.currentTarget as HTMLDivElement).click();
                        }
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition",
                        on
                          ? "border-amber-500 bg-white ring-2 ring-amber-200"
                          : "border-amber-200 bg-white/80 hover:border-amber-400"
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-bold",
                          p <= 0
                            ? "text-amber-950"
                            : plan.durationDays <= 95
                              ? "text-[#C6A15B]"
                              : plan.durationDays <= 190
                                ? "text-[#8E96A3]"
                                : "text-[#7C5CBF]"
                        )}
                      >
                        {planColorName(plan.price, plan.durationDays, lang)}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-amber-800/80">
                        {p <= 0
                          ? lang === "so"
                            ? "Bilaash"
                            : "Free"
                          : planMonthlyRateLabel(p, plan.durationDays, lang)}
                        {p <= 0
                          ? ` · ${planDurationChoiceLabel(
                              plan.durationDays,
                              lang,
                              true
                            )}`
                          : ""}
                      </p>
                      <ul className="mt-1.5 space-y-0.5 text-[11px] font-semibold text-amber-900/85">
                        {livestockScopeLabels(plan, lang).map((line) => (
                          <li key={line}>• {line}</li>
                        ))}
                      </ul>
                      {p <= 0 ? null : (
                        <span className="mt-2 flex w-full items-center gap-2">
                          <button
                            type="button"
                            disabled={months <= 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setPayMonthsByPlan((prev) => ({
                                ...prev,
                                [plan.id]: Math.max(1, months - 1),
                              }));
                              setEvcPaid(null);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-[11px] font-bold text-slate-700">
                            {months} {lang === "so" ? "bil" : months === 1 ? "month" : "months"}
                          </span>
                          <button
                            type="button"
                            disabled={months >= maxMonths}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setPayMonthsByPlan((prev) => ({
                                ...prev,
                                [plan.id]: Math.min(maxMonths, months + 1),
                              }));
                              setEvcPaid(null);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <span className="ml-auto text-xs font-extrabold text-emerald-800">
                            ${due}
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!isFree ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PAYMENT_METHOD_OPTIONS.map((opt) => {
                const on = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      setError("");
                      if (opt.id !== "evc") setEvcPaid(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition",
                      on
                        ? "border-amber-500 bg-white ring-2 ring-amber-200"
                        : "border-amber-200 bg-white/80 hover:border-amber-400"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-white",
                        opt.id === "evc"
                          ? "bg-emerald-600"
                          : opt.id === "visa"
                            ? "bg-[#1434CB]"
                            : "bg-slate-800"
                      )}
                    >
                      {opt.id === "evc" ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </span>
                    <span className="text-sm font-bold text-amber-950">
                      {lang === "so" ? opt.labelSo : opt.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-900">
              {lang === "so"
                ? "Plan-kan waa bilaash — lacag looma baahna."
                : "This plan is free — no payment required."}
            </p>
          )}

          {!isFree && paymentMethod === "evc" ? (
            <EvcChargeForm
              lang={lang}
              amount={price}
              description={`MMPS renewal ${selectedPlan?.name || data.subscription.plan.name}`}
              planId={selectedPlanId}
              merchantHintPhone={phoneHint}
              paid={evcPaid}
              onPaid={(result) => {
                setEvcPaid(result);
                setError("");
              }}
              onClear={() => setEvcPaid(null)}
            />
          ) : null}

          {!isFree && (paymentMethod === "mastercard" || paymentMethod === "visa") ? (
            <MastercardPaymentForm
              lang={lang}
              brand={paymentMethod === "visa" ? "visa" : "mastercard"}
              amount={price}
              values={mastercardForm}
              error={
                error && (paymentMethod === "mastercard" || paymentMethod === "visa")
                  ? error
                  : ""
              }
              onChange={(next) => {
                setMastercardForm(next);
                setError("");
              }}
            />
          ) : null}

          {error && paymentMethod !== "mastercard" && paymentMethod !== "visa" ? (
            <p className="text-xs font-semibold text-rose-700">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={busy || !selectedPlanId}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {lang === "so" ? "Xaqiiji lacag-bixinta" : "Confirm payment"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
