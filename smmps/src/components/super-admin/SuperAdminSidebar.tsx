"use client";

import { type Role } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/rbac-permissions";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  FileText,
  Bell,
  Settings,
  Beef,
  Store,
  CreditCard,
  Shield,
  ChevronDown,
  UserRound,
  Tag,
  KeyRound,
  Layers,
  PanelsTopLeft,
  Calculator,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemBrand } from "@/components/SystemBrand";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "pending" | "notifications";
  permission?: Permission | "SUPER_ADMIN";
};

type NavGroup = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission | "SUPER_ADMIN";
  children: NavItem[];
};

type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; group: NavGroup };

const MAIN_NAV: NavEntry[] = [
  {
    type: "link",
    item: {
      href: "/super-admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      permission: "VIEW_DASHBOARD",
    },
  },
  {
    type: "link",
    item: {
      href: "/super-admin/users",
      label: "Users",
      icon: Users,
      permission: "MANAGE_USERS",
    },
  },
  {
    type: "link",
    item: {
      href: "/super-admin/companies",
      label: "Companies",
      icon: Building2,
      permission: "MANAGE_COMPANIES",
    },
  },
  {
    type: "link",
    item: {
      href: "/super-admin/roles",
      label: "Roles & Permissions",
      icon: Shield,
      permission: "MANAGE_ROLES",
    },
  },
  {
    type: "group",
    group: {
      id: "livestock-brokers",
      label: "Livestock Sector",
      icon: Beef,
      permission: "MANAGE_LIVESTOCK_BROKERS",
      children: [
        {
          href: "/super-admin/livestock",
          label: "Livestock Dashboard",
          icon: LayoutDashboard,
          permission: "MANAGE_LIVESTOCK_BROKERS",
        },
        {
          href: "/super-admin/brokers",
          label: "Brokers",
          icon: UserRound,
          permission: "MANAGE_LIVESTOCK_BROKERS",
        },
        {
          href: "/super-admin/livestock/markets",
          label: "Livestock Markets",
          icon: Store,
          permission: "MANAGE_MARKETS",
        },
        {
          href: "/super-admin/livestock/categories",
          label: "Categories",
          icon: Layers,
          permission: "MANAGE_LIVESTOCK_CATALOG",
        },
        {
          href: "/super-admin/livestock/page-hero",
          label: "Page Hero",
          icon: PanelsTopLeft,
          permission: "MANAGE_LIVESTOCK_BROKERS",
        },
        {
          href: "/super-admin/livestock/market-prices",
          label: "Price Market",
          icon: Calculator,
          permission: "MANAGE_LIVESTOCK_BROKERS",
        },
        {
          href: "/super-admin/livestock/reports",
          label: "Price Reports",
          icon: FileText,
          permission: "MANAGE_LIVESTOCK_BROKERS",
        },
        {
          href: "/super-admin/livestock-prices",
          label: "Approve Prices",
          icon: Tag,
          permission: "APPROVE_LIVESTOCK_PRICE",
        },
      ],
    },
  },
  {
    type: "link",
    item: {
      href: "/super-admin/markets",
      label: "Markets",
      icon: Store,
      permission: "MANAGE_MARKETS",
    },
  },
  {
    type: "link",
    item: {
      href: "/super-admin/approvals",
      label: "Pending Approvals",
      icon: ClipboardCheck,
      badgeKey: "pending",
      permission: "APPROVE_MARKET_PRICE",
    },
  },
  {
    type: "link",
    item: {
      href: "/super-admin/subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
      permission: "MANAGE_SUBSCRIPTIONS",
    },
  },
];

const SYSTEM_NAV: NavItem[] = [
  {
    href: "/super-admin/notifications",
    label: "Notifications",
    icon: Bell,
    badgeKey: "notifications",
    permission: "SEND_NOTIFICATIONS",
  },
  {
    href: "/super-admin/reports",
    label: "Reports",
    icon: FileText,
    permission: "VIEW_REPORTS",
  },
  {
    href: "/super-admin/settings",
    label: "System Settings",
    icon: Settings,
    permission: "MANAGE_SYSTEM_SETTINGS",
  },
  {
    href: "/super-admin/change-password",
    label: "Change Password",
    icon: KeyRound,
  },
];

function canSee(
  userRole: Role | undefined,
  permission?: Permission | "SUPER_ADMIN"
) {
  if (!permission) return true;
  if (permission === "SUPER_ADMIN") return userRole === "SUPER_ADMIN";
  return hasPermission(userRole, permission);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  nested = false,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  badge?: number;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl text-left text-[12px] font-black uppercase tracking-[0.06em] transition-all",
        nested ? "px-3 py-2" : "px-3 py-2.5",
        active
          ? "bg-[#0a5240] text-white shadow-sm"
          : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          nested ? "h-4 w-4" : "h-[18px] w-[18px]",
          active ? "text-emerald-300" : "text-emerald-200/60"
        )}
        strokeWidth={2.25}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold normal-case tracking-normal text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavGroupItem({
  group,
  pathname,
  open,
  onToggle,
  userRole,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  userRole?: Role;
}) {
  const children = group.children.filter((c) => canSee(userRole, c.permission));
  if (!children.length) return null;

  const childActive = children.some((c) => pathname.startsWith(c.href));
  const Icon = group.icon;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] font-black uppercase tracking-[0.06em] transition-all",
          childActive || open
            ? "bg-[#0a5240] text-white shadow-sm"
            : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            childActive || open ? "text-emerald-300" : "text-emerald-200/60"
          )}
          strokeWidth={2.25}
        />
        <span className="flex-1 truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            open ? "rotate-180 text-emerald-200" : "text-emerald-200/70"
          )}
          strokeWidth={2.5}
        />
      </button>

      {open ? (
        <div className="ml-3 space-y-1 border-l border-emerald-400/20 pl-2">
          {children.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              label={child.label}
              icon={child.icon}
              active={
                children.some(
                  (other) =>
                    other.href !== child.href &&
                    other.href.startsWith(`${child.href}/`)
                )
                  ? pathname === child.href
                  : pathname.startsWith(child.href)
              }
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SuperAdminSidebar({
  pendingCount = 0,
  notificationCount = 0,
  userEmail = "superadmin@mmps.so",
  userRole,
}: {
  pendingCount?: number;
  notificationCount?: number;
  userEmail?: string;
  userRole?: Role;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const paths: string[] = [];
    for (const entry of MAIN_NAV) {
      if (entry.type === "link") paths.push(entry.item.href);
      else paths.push(...entry.group.children.map((c) => c.href));
    }
    for (const item of SYSTEM_NAV) paths.push(item.href);
    for (const path of paths) router.prefetch(path);
  }, [router]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const entry of MAIN_NAV) {
        if (entry.type !== "group") continue;
        const active = entry.group.children.some((c) =>
          pathname.startsWith(c.href)
        );
        if (active) next[entry.group.id] = true;
      }
      return next;
    });
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname.startsWith(href.split("#")[0]!);
  }

  function badgeFor(key?: "pending" | "notifications") {
    if (key === "pending") return pendingCount;
    if (key === "notifications") return notificationCount;
    return 0;
  }

  const visibleMain = MAIN_NAV.filter((entry) => {
    if (entry.type === "link") return canSee(userRole, entry.item.permission);
    return (
      canSee(userRole, entry.group.permission) ||
      entry.group.children.some((c) => canSee(userRole, c.permission))
    );
  });

  const visibleSystem = SYSTEM_NAV.filter((item) =>
    canSee(userRole, item.permission)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col bg-[#00392b] lg:flex">
      <div className="flex h-[76px] items-center border-b border-white/10 px-4">
        <Link href="/super-admin" prefetch className="min-w-0">
          <SystemBrand layout="sidebar" />
        </Link>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
          Console
        </p>
        {visibleMain.map((entry) =>
          entry.type === "link" ? (
            <NavLink
              key={entry.item.href}
              href={entry.item.href}
              label={entry.item.label}
              icon={entry.item.icon}
              active={isActive(entry.item.href)}
              badge={badgeFor(entry.item.badgeKey)}
            />
          ) : (
            <NavGroupItem
              key={entry.group.id}
              group={entry.group}
              pathname={pathname}
              userRole={userRole}
              open={Boolean(openGroups[entry.group.id])}
              onToggle={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [entry.group.id]: !prev[entry.group.id],
                }))
              }
            />
          )
        )}

        <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
          System
        </p>
        {visibleSystem.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            badge={badgeFor(item.badgeKey)}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        {/* Logout lives in the topbar user menu only */}
        <div className="rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
            Signed in
          </p>
          <p className="mt-1 truncate text-[12px] font-black uppercase tracking-[0.06em] text-white">
            Super Admin
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-emerald-200/70">
            {userEmail}
          </p>
        </div>
      </div>
    </aside>
  );
}
