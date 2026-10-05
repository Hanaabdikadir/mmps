"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  planCardOrder,
  planColorName,
  planDurationChoiceLabel,
  publicPlanFeatureLabels,
  publicPlanName,
  type PublicSubscriptionPlan,
} from "@/lib/pricing-plans";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

type PlanTab = "livestock" | "electricity" | "water";

function accountTypeLabel(accountType: string, lang: "en" | "so") {
  const type = accountType.trim().toUpperCase();
  const labels: Record<string, { en: string; so: string }> = {
    ALL: { en: "All accounts", so: "Dhammaan akoonada" },
    LIVESTOCK: { en: "Livestock", so: "Xoolaha" },
    ELECTRICITY: { en: "Electricity", so: "Korontada" },
    WATER: { en: "Water", so: "Biyaha" },
    COMPANY: { en: "Company", so: "Shirkad" },
    BROKER: { en: "Broker", so: "Dilaal" },
  };
  const pair = labels[type] ?? { en: accountType, so: accountType };
  return lang === "so" ? pair.so : pair.en;
}

function planOnTab(plan: PublicSubscriptionPlan, tab: PlanTab) {
  const type = plan.accountType.trim().toUpperCase();
  if (type === "ALL" || type === "COMPANY") return true;
  if (tab === "livestock") return type === "LIVESTOCK" || type === "BROKER";
  if (tab === "electricity") return type === "ELECTRICITY";
  return type === "WATER";
}

export function PricingPlansView() {
  const { lang } = useLang();
  const [tab, setTab] = useState<PlanTab>("livestock");
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subscriptions/public", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { plans?: PublicSubscriptionPlan[] }) => {
        if (cancelled) return;
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          setPlans([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () =>
      plans
        .filter((plan) => planOnTab(plan, tab))
        .sort((a, b) => planCardOrder(a) - planCardOrder(b) || a.id - b.id),
    [plans, tab]
  );

  const tone =
    tab === "electricity"
      ? {
          card: "border-amber-200",
          badge: "bg-amber-50 text-amber-800",
          button: "bg-amber-300 hover:bg-amber-400 text-amber-950",
        }
      : tab === "water"
        ? {
            card: "border-blue-200",
            badge: "bg-blue-50 text-blue-800",
            button: "bg-blue-300 hover:bg-blue-400 text-blue-950",
          }
        : {
            card: "border-green-200",
            badge: "bg-green-50 text-green-800",
            button: "bg-green-300 hover:bg-green-400 text-green-950",
          };

  const tabs: { id: PlanTab; en: string; so: string }[] = [
    { id: "livestock", en: "Livestock", so: "Xoolaha" },
    { id: "electricity", en: "Electricity", so: "Korontada" },
    { id: "water", en: "Water", so: "Biyaha" },
  ];

  return (
    <div className="page-shell mx-auto max-w-6xl px-3 py-8 min-[360px]:px-4 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
          {lang === "so" ? "Qidmada MMPS" : "MMPS subscriptions"}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {lang === "so" ? "Dooro Qidmad" : "Choose a subscription plan"}
        </h1>
      </div>

      <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2">
        {tabs.map((item) => {
          const isActive = tab === item.id;
          return (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-200",
              item.id === "livestock" &&
                (isActive
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-300/60 ring-4 ring-emerald-200 scale-105"
                  : "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-500 hover:bg-emerald-50"),
              item.id === "electricity" &&
                (isActive
                  ? "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-300/60 ring-4 ring-amber-200 scale-105"
                  : "border-amber-200 bg-white text-amber-900 hover:border-amber-500 hover:bg-amber-50"),
              item.id === "water" &&
                (isActive
                  ? "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-300/60 ring-4 ring-sky-200 scale-105"
                  : "border-sky-200 bg-white text-sky-900 hover:border-sky-500 hover:bg-sky-50")
            )}
          >
            {lang === "so" ? item.so : item.en}
          </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {lang === "so" ? "Qidmada waa la soo rarayaa…" : "Loading plans…"}
        </div>
      ) : failed ? (
        <p className="mx-auto mt-10 max-w-lg rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700">
          {lang === "so"
            ? "Qidmada lama soo rarin karin. Mar kale isku day."
            : "Plans could not be loaded. Try again in a moment."}
        </p>
      ) : visible.length === 0 ? (
        <p className="mx-auto mt-10 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm font-semibold text-amber-900">
          {lang === "so"
            ? "Weli ma jiraan qidmad firfircoon. Super Admin ayaa ku daraya Qidmada."
            : "No active plans yet. Super Admin adds them in Subscriptions."}
        </p>
      ) : (
        <div
          className={cn(
            "mt-8 grid items-stretch gap-4",
            visible.length === 3
              ? "sm:grid-cols-3"
              : "sm:grid-cols-2"
          )}
        >
          {visible.map((plan, index) => {
            const themes = [
              {
                card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100",
                badge: "bg-emerald-100 text-emerald-800",
                button: "bg-emerald-500 hover:bg-emerald-600 text-white",
              },
              {
                card: "border-teal-200 bg-gradient-to-br from-teal-50 to-white hover:-translate-y-1 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-100",
                badge: "bg-teal-100 text-teal-800",
                button: "bg-teal-500 hover:bg-teal-600 text-white",
              },
              {
                card: "border-sky-200 bg-gradient-to-br from-sky-50 to-white hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100",
                badge: "bg-sky-100 text-sky-800",
                button: "bg-sky-500 hover:bg-sky-600 text-white",
              },
              {
                card: "border-violet-200 bg-gradient-to-br from-violet-50 to-white hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100",
                badge: "bg-violet-100 text-violet-800",
                button: "bg-violet-500 hover:bg-violet-600 text-white",
              },
            ];
            const theme = themes[index % themes.length];
            return (
            <article
              key={plan.id}
              className={cn(
                "flex h-full min-h-[22rem] flex-col rounded-2xl border p-6 shadow-sm transition-all duration-200",
                theme.card
              )}
            >
              <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide", theme.badge)}>
                {accountTypeLabel(plan.accountType, lang)}
              </span>
              <h2 className="mt-4 h-8 text-xl font-semibold leading-8 tracking-tight text-black">
                {Number(plan.price) > 0 && lang === "so"
                  ? `Rukumo adeegga ${planColorName(plan.price, plan.durationDays, lang)}`
                  : planColorName(plan.price, plan.durationDays, lang)}
              </h2>
              <div className="mt-3 h-[4.5rem]">
                {Number(plan.price) > 0 ? (
                  <>
                    <p className="flex items-baseline gap-1.5 leading-none tracking-tight text-black">
                      <span className="text-3xl font-semibold">
                        $
                        {(
                          Math.round(
                            (Number(plan.price) /
                              Math.max(1, Math.round(plan.durationDays / 30.4))) *
                              100
                          ) / 100
                        ).toFixed(2)}
                      </span>
                      <span className="text-sm font-light text-black">
                        {lang === "so" ? "/Bishii" : "/Per Month"}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-black">
                    {planDurationChoiceLabel(plan.durationDays, lang, Number(plan.price) <= 0)}
                  </p>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-1.5 border-t border-slate-200/80 pt-4">
                {publicPlanFeatureLabels(plan, tab, lang).map((line) => (
                  <li key={line} className="text-sm font-medium leading-6 text-black">
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                href={`/register?plan=${plan.id}`}
                className={cn(
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide transition",
                  theme.button
                )}
              >
                {Number(plan.price) > 0 && lang === "so"
                  ? `Rukumo adeegga ${planColorName(plan.price, plan.durationDays, lang)}`
                  : lang === "so"
                    ? "Is diiwaangali hada"
                    : "Register now"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
