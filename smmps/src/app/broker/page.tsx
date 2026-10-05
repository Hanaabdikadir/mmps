import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CreditCard,
  ExternalLink,
  LineChart,
  MapPin,
  UserRound,
} from "lucide-react";
import { cookies } from "next/headers";
import { parseLang } from "@/lib/lang";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySlugFromBroker } from "@/lib/livestock-section-prices";
import { LIVESTOCK_CATEGORY_PAGES } from "@/lib/livestock-data";
import { getBrokerScope } from "@/lib/livestock-scope";
import { formatBrokerDisplayName } from "@/lib/broker-display-name";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { publicPlanName } from "@/lib/pricing-plans";
import { BrokerPublicMarketCard } from "@/components/broker/BrokerPublicMarketCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BrokerHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const broker = user.brokerId
    ? await prisma.livestockBroker.findUnique({
        where: { id: user.brokerId },
        select: { name: true, livestockFocus: true, marketId: true },
      })
    : null;

  const slug = categorySlugFromBroker({
    livestockFocus: broker?.livestockFocus,
    name: broker?.name,
    companyType: user.companyType,
  });
  const meta = LIVESTOCK_CATEGORY_PAGES[slug];
  const scope = user.brokerId ? await getBrokerScope(user.brokerId).catch(() => null) : null;
  const markets = scope?.markets || [];
  const publicMarket =
    markets.find((m) => m.id === broker?.marketId) || markets[0] || null;
  const marketName = publicMarket?.name?.trim() || "";
  const lang = parseLang((await cookies()).get("mmps-lang")?.value);
  const sectionName = formatBrokerDisplayName(broker?.name, broker?.livestockFocus, lang);

  const [priceCount, liveCount, pendingCount, subscription] = user.brokerId
    ? await Promise.all([
        prisma.livestockPrice.count({
          where: { brokerId: user.brokerId, deletedAt: null },
        }),
        prisma.livestockPrice.count({
          where: {
            brokerId: user.brokerId,
            deletedAt: null,
            status: "APPROVED",
            price: { gt: 0 },
          },
        }),
        prisma.livestockPrice.count({
          where: {
            brokerId: user.brokerId,
            deletedAt: null,
            status: "PENDING",
            price: { gt: 0 },
          },
        }),
        prisma.subscription.findFirst({
          where: { brokerId: user.brokerId },
          include: { plan: { select: { name: true } } },
          orderBy: { expiryDate: "desc" },
        }),
      ])
    : [0, 0, 0, null];

  const cards = [
    {
      label: lang === "so" ? "Profileka Dulaalka" : "Broker Profile",
      title: sectionName || (lang === "so" ? "Akoonkaaga" : "Your account"),
      hint: lang === "so" ? "Magaca, sawirka, iyo xiriirka" : "Name, photo, and contact",
      href: "/broker/profile",
      icon: UserRound,
      iconWrap: "bg-orange-500 shadow-orange-500/30",
      card: "from-orange-50/90 via-white to-white ring-orange-100 hover:ring-orange-300",
      accent: "text-orange-700",
    },
    {
      label: lang === "so" ? "Cusboonaysii qiimaha" : "Update Price",
      title: lang === "so" ? "Birimo / Sugunto" : "First Class and Second Class",
      hint:
        pendingCount > 0
          ? `${pendingCount} ${lang === "so" ? "sugaya — geli qiimo cusub" : "pending — enter a new price"}`
          : lang === "so"
            ? "Geli qiimaha Birimo iyo Sugunto"
            : "Enter First Class and Second Class prices",
      href: "/broker/update-price",
      icon: Calculator,
      iconWrap: "bg-emerald-600 shadow-emerald-600/30",
      card: "from-emerald-50/90 via-white to-white ring-emerald-100 hover:ring-emerald-300",
      accent: "text-emerald-800",
    },
    {
      label: lang === "so" ? "Qidmad" : "Subscription",
      title: subscription?.plan.name
        ? publicPlanName(subscription.plan.name, lang === "so" ? "so" : "en")
        : lang === "so"
          ? "Qorshe ma jiro"
          : "No plan",
      hint: subscription
        ? `${
            lang === "so"
              ? subscription.status === "ACTIVE"
                ? "Firfircoon"
                : subscription.status === "EXPIRED"
                  ? "Dhacay"
                  : subscription.status.replace(/_/g, " ")
              : subscription.status.replace(/_/g, " ")
          } · ${lang === "so" ? "Fiiri faahfaahinta" : "View plan details"}`
        : lang === "so"
          ? "La xiriir admin si loo furmo"
          : "Contact admin to activate",
      href: "/broker/subscription",
      icon: CreditCard,
      iconWrap: "bg-sky-600 shadow-sky-600/30",
      card: "from-sky-50/90 via-white to-white ring-sky-100 hover:ring-sky-300",
      accent: "text-sky-800",
    },
    {
      label: lang === "so" ? "Taariikhda Qiimaha" : "Price History",
      title: String(liveCount || priceCount),
      hint:
        liveCount > 0
          ? `${liveCount} ${lang === "so" ? "toos" : "live"} · ${priceCount} ${lang === "so" ? "dhammaan" : "all"}`
          : lang === "so"
            ? "Qiimaha la aqbalay"
            : "Approved prices",
      href: "/broker/prices",
      icon: LineChart,
      iconWrap: "bg-violet-600 shadow-violet-600/30",
      card: "from-violet-50/90 via-white to-white ring-violet-100 hover:ring-violet-300",
      accent: "text-violet-800",
    },
    {
      label: lang === "so" ? "Bogga dadweynaha" : "Public page",
      title:
        livestockMarketDisplayName(publicMarket?.name, lang) ||
        (lang === "so" ? meta.somali : meta.english),
      hint: lang === "so" ? "Bogga dadweynaha ee suuqa" : "The public market page",
      href: "/livestock",
      external: true,
      icon: ExternalLink,
      iconWrap: "bg-amber-500 shadow-amber-500/30",
      card: "from-amber-50/90 via-white to-white ring-amber-100 hover:ring-amber-300",
      accent: "text-amber-800",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00392b] via-[#0a5240] to-teal-800 px-5 py-6 text-white shadow-lg shadow-emerald-950/20 sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, rgba(52,211,153,0.35), transparent 42%), radial-gradient(circle at 92% 80%, rgba(251,191,36,0.22), transparent 40%)",
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200/90">
            {lang === "so" ? "Dulmar" : "Overview"}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {sectionName}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-emerald-50/90">
            {lang === "so"
              ? "Geli qiimaha xoolaha Birimo iyo Sugunto. Marka la aqbalo, qiimaha wuxuu kasoo muuqan doonaa bogga dadweynaha"
              : "Enter First Class and Second Class livestock prices. Once approved, the price will appear on the public page."}
          </p>
          {marketName ? (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-50 ring-1 ring-white/15">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
              {livestockMarketDisplayName(marketName, lang).trim() || marketName}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          if (card.external) {
            return (
              <BrokerPublicMarketCard
                key={card.label}
                lang={lang === "so" ? "so" : "en"}
                title={
                  lang === "so" ? "Suuqa Xoolaha" : "Livestock Market"
                }
              />
            );
          }
          return (
            <Link
              key={card.label}
              href={card.href}
              target={card.external ? "_blank" : undefined}
              rel={card.external ? "noreferrer" : undefined}
              className={cn(
                "group flex min-h-[11.5rem] flex-col rounded-3xl bg-gradient-to-br p-5 ring-1 shadow-sm transition duration-200",
                "hover:-translate-y-1 hover:shadow-lg",
                card.card
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {card.label}
                </p>
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md",
                    card.iconWrap
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
              </div>
              <p className={cn("mt-4 text-2xl font-black leading-tight tracking-tight", card.accent)}>
                {card.title}
              </p>
              <p className="mt-2 flex-1 text-sm font-medium leading-snug text-slate-500">
                {card.hint}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                {lang === "so" ? "Fur" : "Open"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
