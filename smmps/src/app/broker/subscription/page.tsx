import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreditCard } from "lucide-react";
import { refreshSubscriptionStatuses } from "@/lib/subscriptions";
import { SubscriptionRenewalPanel } from "@/components/subscriptions/SubscriptionRenewalPanel";
import { BrokerPlanSlots } from "@/components/broker/BrokerPlanSlots";
import { parseLang } from "@/lib/lang";
import { publicPlanName, livestockScopeLabels } from "@/lib/pricing-plans";
import { getBrokerPlanLimits } from "@/lib/livestock-scope";

export const dynamic = "force-dynamic";

export default async function BrokerSubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = parseLang((await cookies()).get("mmps-lang")?.value);
  const tx = (en: string, so: string) => (lang === "so" ? so : en);

  await refreshSubscriptionStatuses().catch(() => null);

  const subscription = user.brokerId
    ? await prisma.subscription.findFirst({
        where: { brokerId: user.brokerId },
        include: { plan: true },
        orderBy: { expiryDate: "desc" },
      })
    : null;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h2 className="text-lg font-black text-slate-900">{tx("Subscription", "Qidmad")}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {subscription
                ? publicPlanName(subscription.plan.name, lang)
                : tx("No active subscription", "Qidmad firfircoon ma jirto")}
            </p>
            <p className="text-xs text-slate-500">{tx("Subscription status", "Xaaladda qidmada")}</p>
          </div>
        </div>

        {subscription ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tx("Status", "Xaaladda")}</dt>
              <dd className="mt-1"><StatusBadge status={subscription.status} /></dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tx("Amount paid", "Lacagta la bixiyay")}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {subscription.paidAmount == null
                  ? tx("Not recorded", "Lama diiwaangelin")
                  : `$${subscription.paidAmount.toFixed(2)}`}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tx("Start date", "Taariikhda bilowga")}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{subscription.startDate.toISOString().slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tx("Expiry date", "Taariikhda dhammaadka")}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{subscription.expiryDate.toISOString().slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tx("Months paid", "Bilaha la bixiyay")}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {subscription.paidMonths == null
                  ? tx("Not recorded", "Lama diiwaangelin")
                  : `${subscription.paidMonths} ${tx("month(s)", "bil")}`}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {tx("What you can manage", "Waxaad maamuli karto")}
              </dt>
              <dd className="mt-1 space-y-0.5 text-sm font-semibold text-slate-800">
                {livestockScopeLabels(
                  user.brokerId
                    ? await getBrokerPlanLimits(user.brokerId)
                    : {
                        maxMarkets: subscription.plan.maxMarkets,
                        maxLivestockTypes: subscription.plan.maxLivestockTypes,
                      },
                  lang
                ).map((line) => (
                  <p key={line}>• {line}</p>
                ))}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {tx(
              "You do not have an active subscription. Contact the admin to activate one.",
              "Qidmad firfircoon ma lihid. La xiriir maamulka si loo furto."
            )}
          </p>
        )}
      </div>
      <BrokerPlanSlots lang={lang} />
      <SubscriptionRenewalPanel portal="broker" />
    </div>
  );
}
