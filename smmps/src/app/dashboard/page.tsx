import { redirect } from "next/navigation";
import Link from "next/link";
import { Beef, Droplets, Star, Zap, ArrowRight } from "lucide-react";
import {
  getCurrentUser,
  isCompanyAdmin,
  isCompanyUser,
  isLivestockBroker,
  isSuperAdmin,
} from "@/lib/auth";
import { brokerHomeHref } from "@/lib/livestock-manager-broker";
import { getUserDashboardData } from "@/lib/dashboard-service";
import {
  UserDashboardHero,
  SectorQuickLinks,
  NotificationPanel,
} from "@/components/dashboard/DashboardHero";
import { StatCard, AvgPriceCard } from "@/components/StatCard";
import { TrendChart } from "@/components/TrendChart";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UserDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isSuperAdmin(user)) redirect("/super-admin");
  if (isCompanyAdmin(user) || isCompanyUser(user)) {
    redirect("/admin");
  }
  if (isLivestockBroker(user)) redirect(brokerHomeHref(user));
  // Accepted applicants stay on the account portal until assigned a company/broker role
  if (user.role === "REGISTERED") redirect("/account");

  const data = await getUserDashboardData(user);
  const { stats, trends, notifications, favorites } = data;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="livestock-mesh min-h-screen">
      <div className="page-shell mx-auto max-w-7xl space-y-8 px-3 py-6 min-[360px]:px-4 sm:px-6 sm:py-10">
        <UserDashboardHero name={user.fullName} unreadCount={unread} />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Livestock Records"
            value={stats.livestockCount}
            icon="livestock"
            color="blue"
          />
          <StatCard
            title="Water Records"
            value={stats.waterCount}
            icon="water"
            color="blue"
          />
          <StatCard
            title="Electricity Records"
            value={stats.electricityCount}
            icon="electricity"
            color="amber"
          />
          <StatCard
            title="Updates Today"
            value={stats.dailyUpdates}
            subtitle="New records added"
            icon="updates"
            color="violet"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <AvgPriceCard
            label="Livestock (30-day avg)"
            amount={stats.monthlyAvgLivestock}
            color="blue"
          />
          <AvgPriceCard
            label="Water (30-day avg)"
            amount={stats.monthlyAvgWater}
            color="blue"
          />
          <AvgPriceCard
            label="Electricity (30-day avg)"
            amount={stats.monthlyAvgElectricity}
            color="amber"
          />
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Explore Markets</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Jump straight to sector prices across Mogadishu
            </p>
          </div>
          <SectorQuickLinks />
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <section>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900">7-Day Trends</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Weekly price movement at a glance
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <Card>
                  <CardHeader
                    title="Livestock"
                    description="7-day movement"
                    icon={<Beef className="h-5 w-5" />}
                  />
                  <TrendChart data={trends.livestock} color="#2563eb" label="Price" />
                </Card>
                <Card>
                  <CardHeader
                    title="Water"
                    description="7-day movement"
                    icon={<Droplets className="h-5 w-5" />}
                  />
                  <TrendChart data={trends.water} color="#2563eb" label="Price" />
                </Card>
                <Card className="sm:col-span-2 xl:col-span-1">
                  <CardHeader
                    title="Electricity"
                    description="7-day movement"
                    icon={<Zap className="h-5 w-5" />}
                  />
                  <TrendChart data={trends.electricity} color="#d97706" label="Price" />
                </Card>
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <NotificationPanel notifications={notifications} />

            <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-[var(--shadow)]">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                    <Star className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Watchlist</h3>
                    <p className="text-xs text-[var(--muted)]">Your saved categories</p>
                  </div>
                </div>
              </div>
              {favorites.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Star className="mx-auto h-7 w-7 text-gray-200" />
                  <p className="mt-3 text-sm text-gray-500">No favorites saved yet</p>
                  <Link
                    href="/livestock"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    Browse livestock <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 p-2">
                  {favorites.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-amber-50/50"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatLabel(f.category)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{formatLabel(f.sector)}</p>
                      </div>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
