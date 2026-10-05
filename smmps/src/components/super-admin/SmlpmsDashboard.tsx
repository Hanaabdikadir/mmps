"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Bell,
  LogIn,
  KeyRound,
  UserPlus,
  UserRoundX,
  Trash2,
  Droplets,
  Zap,
  BadgeDollarSign,
  ShieldCheck,
  ScrollText,
  Pencil,
  RefreshCw,
  ArrowUpRight,
  Beef,
  CircleCheck,
  CircleX,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { cn } from "@/lib/utils";
import { formatMmpsStamp } from "@/lib/mogadishu-time";

type ActivityRow = {
  id: number;
  action: string;
  entity: string;
  description: string | null;
  createdAt: string;
  userName: string | null;
  userEmail?: string | null;
};

type NotificationRow = {
  id: number;
  title: string;
  message: string;
  sector?: string;
  href?: string | null;
  createdAt: string;
  read: boolean;
};

type Stats = {
  totalCompanies: number;
  totalBrokers: number;
  totalUsers: number;
  pendingApprovals: number;
  approvedPrices: number;
  rejectedPrices: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  marketPriceCount: number;
  waterPriceCount: number;
  electricityPriceCount: number;
  livestockPriceCount: number;
  monthlySubmissions: { month: string; count: number }[];
  recentActivities: ActivityRow[];
  recentNotifications: NotificationRow[];
};

function humanizeToken(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function activityTitle(a: ActivityRow) {
  if (a.description?.trim()) return a.description.trim();
  const action = humanizeToken(a.action);
  const entity = humanizeToken(a.entity);
  if (a.action.toUpperCase().includes("LOGIN")) {
    return a.userEmail
      ? `${a.userEmail} signed in`
      : `${a.userName || "User"} signed in`;
  }
  return `${action} · ${entity}`;
}

function activityMeta(action: string, entity: string): {
  icon: LucideIcon;
  tone: string;
  badge: string;
  label: string;
} {
  const key = `${action} ${entity}`.toUpperCase();
  if (key.includes("LOGIN") || key.includes("SIGNED")) {
    return {
      icon: LogIn,
      tone: "bg-blue-600 text-white ring-blue-700/30",
      badge: "bg-blue-50 text-blue-800 ring-blue-200",
      label: "Signed in",
    };
  }
  if (key.includes("WATER")) {
    return {
      icon: Droplets,
      tone: "bg-cyan-600 text-white ring-cyan-700/30",
      badge: "bg-cyan-50 text-cyan-800 ring-cyan-200",
      label: "Water price",
    };
  }
  if (key.includes("ELECTRIC") || key.includes("POWER")) {
    return {
      icon: Zap,
      tone: "bg-amber-500 text-white ring-amber-600/30",
      badge: "bg-amber-50 text-amber-900 ring-amber-200",
      label: "Power price",
    };
  }
  if (key.includes("LIVESTOCK") || key.includes("BEEF")) {
    return {
      icon: Beef,
      tone: "bg-orange-600 text-white ring-orange-700/30",
      badge: "bg-orange-50 text-orange-900 ring-orange-200",
      label: "Livestock",
    };
  }
  if (key.includes("CREATE") && key.includes("PRICE")) {
    return {
      icon: BadgeDollarSign,
      tone: "bg-emerald-600 text-white ring-emerald-700/30",
      badge: "bg-emerald-50 text-emerald-900 ring-emerald-200",
      label: "Price created",
    };
  }
  if (key.includes("UPDATE") && key.includes("PRICE")) {
    return {
      icon: Pencil,
      tone: "bg-teal-600 text-white ring-teal-700/30",
      badge: "bg-teal-50 text-teal-900 ring-teal-200",
      label: "Price updated",
    };
  }
  if (key.includes("CREATE") && key.includes("USER")) {
    return {
      icon: UserPlus,
      tone: "bg-violet-600 text-white ring-violet-700/30",
      badge: "bg-violet-50 text-violet-900 ring-violet-200",
      label: "User created",
    };
  }
  if (key.includes("DELETE")) {
    return {
      icon: Trash2,
      tone: "bg-rose-600 text-white ring-rose-700/30",
      badge: "bg-rose-50 text-rose-900 ring-rose-200",
      label: "Deleted",
    };
  }
  if (key.includes("SUSPEND")) {
    return {
      icon: UserRoundX,
      tone: "bg-fuchsia-600 text-white ring-fuchsia-700/30",
      badge: "bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-200",
      label: "Suspended",
    };
  }
  if (key.includes("PASSWORD") || key.includes("RESET")) {
    return {
      icon: KeyRound,
      tone: "bg-slate-700 text-white ring-slate-800/30",
      badge: "bg-slate-100 text-slate-800 ring-slate-300",
      label: "Password",
    };
  }
  if (key.includes("APPROV")) {
    return {
      icon: ShieldCheck,
      tone: "bg-lime-600 text-white ring-lime-700/30",
      badge: "bg-lime-50 text-lime-900 ring-lime-200",
      label: "Approved",
    };
  }
  if (key.includes("REPORT")) {
    return {
      icon: ScrollText,
      tone: "bg-indigo-600 text-white ring-indigo-700/30",
      badge: "bg-indigo-50 text-indigo-900 ring-indigo-200",
      label: "Reports",
    };
  }
  return {
    icon: Activity,
    tone: "bg-stone-600 text-white ring-stone-700/30",
    badge: "bg-stone-100 text-stone-800 ring-stone-200",
    label: humanizeToken(action),
  };
}

function notificationMeta(
  title: string,
  message: string,
  sector?: string
): { icon: LucideIcon; tone: string } {
  const text = `${sector || ""} ${title} ${message}`.toLowerCase();
  if (text.includes("water")) {
    return { icon: Droplets, tone: "bg-cyan-600 text-white ring-cyan-700/30" };
  }
  if (text.includes("electric") || text.includes("power")) {
    return { icon: Zap, tone: "bg-amber-500 text-white ring-amber-600/30" };
  }
  if (text.includes("livestock")) {
    return { icon: Beef, tone: "bg-orange-600 text-white ring-orange-700/30" };
  }
  if (text.includes("price")) {
    return {
      icon: BadgeDollarSign,
      tone: "bg-emerald-600 text-white ring-emerald-700/30",
    };
  }
  if (text.includes("user") || text.includes("account")) {
    return {
      icon: Users,
      tone: "bg-violet-600 text-white ring-violet-700/30",
    };
  }
  if (text.includes("approv")) {
    return {
      icon: ShieldCheck,
      tone: "bg-lime-600 text-white ring-lime-700/30",
    };
  }
  if (text.includes("subscri")) {
    return {
      icon: CreditCard,
      tone: "bg-indigo-600 text-white ring-indigo-700/30",
    };
  }
  return { icon: Bell, tone: "bg-sky-600 text-white ring-sky-700/30" };
}

export function SmlpmsDashboard({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(stats.recentNotifications);
  const [busyId, setBusyId] = useState<number | null>(null);

  const chartData = useMemo(
    () => [
      { name: "Active", value: stats.activeSubscriptions },
      { name: "Expired", value: stats.expiredSubscriptions },
      { name: "Water", value: stats.waterPriceCount },
      { name: "Electricity", value: stats.electricityPriceCount },
      { name: "Livestock", value: stats.livestockPriceCount },
    ],
    [stats]
  );

  async function openNotification(n: NotificationRow) {
    setBusyId(n.id);
    try {
      if (!n.read) {
        const res = await fetch("/api/super-admin/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: String(n.id), read: true }),
        });
        if (res.ok) {
          setNotifications((prev) =>
            prev.map((row) =>
              row.id === n.id ? { ...row, read: true } : row
            )
          );
        }
      }
      if (n.href) {
        router.push(n.href);
        router.refresh();
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:gap-3 lg:overflow-visible">
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Users"
            value={stats.totalUsers}
            hint="System accounts"
            icon={Users}
            tone="violet"
            onClick={() => router.push("/super-admin/users")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Active"
            value={stats.activeSubscriptions}
            hint="Subscriptions"
            icon={CircleCheck}
            tone="emerald"
            onClick={() => router.push("/super-admin/subscriptions")}
          />
        </div>
        <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Expired"
            value={stats.expiredSubscriptions}
            hint="Subscriptions"
            icon={CircleX}
            tone="rose"
            onClick={() => router.push("/super-admin/subscriptions")}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5  lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-700">
              Monthly Price Submissions
            </h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
              <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlySubmissions}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a5240" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#0a5240" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0a5240"
                  fill="url(#colorCount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5  lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-700">
              Subscriptions & Prices
            </h3>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-800 ring-1 ring-teal-200">
              <BadgeDollarSign className="h-4 w-4" strokeWidth={2.25} />
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  fill="#0f766e"
                  radius={[6, 6, 0, 0]}
                  name="Count"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              Water companies: <strong>{stats.waterPriceCount}</strong>
            </span>
            <span>
              Electricity companies: <strong>{stats.electricityPriceCount}</strong>
            </span>
            <span>
              Livestock brokers: <strong>{stats.livestockPriceCount}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Activity className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-800">
                  Recent Activity
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Latest system activity
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
              title="Refresh activity"
              aria-label="Refresh activity"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
          {stats.recentActivities.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm font-medium text-slate-500">
              No recent activity.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentActivities.map((a) => {
                const meta = activityMeta(a.action, a.entity);
                const Icon = meta.icon;
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/90"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                        meta.tone
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {activityTitle(a)}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset",
                            meta.badge
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-slate-500">
                        {a.userName || a.userEmail || "System"} ·{" "}
                        {formatMmpsStamp(a.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Bell className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-800">
                  Recent Notifications
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Super Admin alerts from the system
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-sky-300 hover:text-sky-700"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm font-medium text-slate-500">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const meta = notificationMeta(n.title, n.message, n.sector);
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      disabled={busyId === n.id}
                      onClick={() => void openNotification(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-sky-50/60 disabled:opacity-60",
                        !n.read && "bg-sky-50/30"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                          meta.tone
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-[13px] font-bold text-slate-900">
                            {n.title}
                          </p>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            {!n.read ? (
                              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-600 ring-2 ring-sky-100" />
                            ) : (
                              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-300" />
                            )}
                            {n.href ? (
                              <ArrowUpRight
                                className="h-3.5 w-3.5 text-sky-600"
                                strokeWidth={2.5}
                              />
                            ) : null}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-600">
                          {n.message}
                        </p>
                        <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                          {formatMmpsStamp(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
