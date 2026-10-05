"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beef,
  Bell,
  Building2,
  Check,
  CircleDollarSign,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatRoleLabel } from "@/lib/role-labels";
import { cn } from "@/lib/utils";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import {
  AdminPageHeader,
  KpiCard,
} from "@/components/super-admin/AdminPagePrimitives";
import { useActionMessage } from "@/components/super-admin/use-action-message";

type Permission = {
  id: number;
  code: string;
  name: string;
  module: string | null;
};

type RoleRow = {
  role: string;
  permissions: string[];
  source: string;
  count?: number;
};

const MODULE_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: string; iconBg: string }
> = {
  dashboard: {
    label: "Dashboard",
    icon: LayoutDashboard,
    tone: "border-indigo-200 bg-indigo-50/60",
    iconBg: "bg-indigo-600 text-white",
  },
  profile: {
    label: "Profile",
    icon: UserRound,
    tone: "border-sky-200 bg-sky-50/60",
    iconBg: "bg-sky-600 text-white",
  },
  company: {
    label: "Company",
    icon: Building2,
    tone: "border-teal-200 bg-teal-50/60",
    iconBg: "bg-teal-600 text-white",
  },
  users: {
    label: "Users",
    icon: Users,
    tone: "border-violet-200 bg-violet-50/60",
    iconBg: "bg-violet-600 text-white",
  },
  roles: {
    label: "Roles",
    icon: Shield,
    tone: "border-emerald-200 bg-emerald-50/60",
    iconBg: "bg-emerald-600 text-white",
  },
  companies: {
    label: "Companies",
    icon: Building2,
    tone: "border-blue-200 bg-blue-50/60",
    iconBg: "bg-blue-600 text-white",
  },
  brokers: {
    label: "Brokers",
    icon: Beef,
    tone: "border-orange-200 bg-orange-50/60",
    iconBg: "bg-orange-600 text-white",
  },
  markets: {
    label: "Markets",
    icon: Store,
    tone: "border-cyan-200 bg-cyan-50/60",
    iconBg: "bg-cyan-600 text-white",
  },
  prices: {
    label: "Prices",
    icon: CircleDollarSign,
    tone: "border-amber-200 bg-amber-50/60",
    iconBg: "bg-amber-500 text-white",
  },
  livestock: {
    label: "Livestock",
    icon: Beef,
    tone: "border-orange-200 bg-orange-50/60",
    iconBg: "bg-orange-600 text-white",
  },
  reports: {
    label: "Reports",
    icon: FileText,
    tone: "border-indigo-200 bg-indigo-50/60",
    iconBg: "bg-indigo-600 text-white",
  },
  subscriptions: {
    label: "Subscriptions",
    icon: CreditCard,
    tone: "border-rose-200 bg-rose-50/60",
    iconBg: "bg-rose-600 text-white",
  },
  notifications: {
    label: "Notifications",
    icon: Bell,
    tone: "border-amber-200 bg-amber-50/60",
    iconBg: "bg-amber-500 text-white",
  },
  settings: {
    label: "Settings",
    icon: Settings,
    tone: "border-slate-200 bg-slate-50/80",
    iconBg: "bg-slate-700 text-white",
  },
  other: {
    label: "Other",
    icon: Shield,
    tone: "border-slate-200 bg-white",
    iconBg: "bg-slate-500 text-white",
  },
};

function moduleMeta(module: string) {
  return MODULE_META[module.toLowerCase()] || MODULE_META.other;
}

export function RolesManager() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState("SUPER_ADMIN");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [source, setSource] = useState("database");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to load roles from database.",
        });
        return;
      }
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      const current = (data.roles || []).find(
        (r: RoleRow) => r.role === selectedRole
      );
      setChecked(new Set(current?.permissions || []));
      setSource(current?.source || "database");
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRolePerms = useMemo(() => {
    const current = roles.find((r) => r.role === selectedRole);
    return new Set(current?.permissions || checked);
  }, [roles, selectedRole, checked]);

  const visiblePermissions = useMemo(() => {
    if (selectedRole === "SUPER_ADMIN") {
      return permissions.filter(
        (p) =>
          p.code !== "ADD_MARKET_PRICE" &&
          p.code !== "EDIT_MARKET_PRICE" &&
          p.code !== "ADD_LIVESTOCK_PRICE" &&
          p.code !== "EDIT_LIVESTOCK_PRICE"
      );
    }
    return permissions.filter((p) => selectedRolePerms.has(p.code));
  }, [permissions, selectedRole, selectedRolePerms]);

  const grouped = useMemo(() => {
    return visiblePermissions.reduce<Record<string, Permission[]>>((acc, p) => {
      const m = (p.module || "other").toLowerCase();
      acc[m] = acc[m] || [];
      acc[m].push(p);
      return acc;
    }, {});
  }, [visiblePermissions]);

  const stats = useMemo(() => {
    const selected = roles.find((r) => r.role === selectedRole);
    return {
      roles: roles.length,
      catalog: visiblePermissions.length,
      granted: checked.size,
      modules: Object.keys(grouped).length,
      source: selected?.source || source,
    };
  }, [
    roles,
    visiblePermissions.length,
    checked.size,
    grouped,
    selectedRole,
    source,
  ]);

  function selectRole(role: string) {
    setSelectedRole(role);
    setMessage(null);
    const current = roles.find((r) => r.role === role);
    setChecked(new Set(current?.permissions || []));
    setSource(current?.source || "database");
  }

  const isSuperAdminRole = selectedRole === "SUPER_ADMIN";
  const isSystemLockedRole =
    selectedRole === "COMPANY_ADMIN" ||
    selectedRole === "LIVESTOCK_BROKER_USER" ||
    selectedRole === "REGISTERED";

  function toggle(code: string) {
    if (isSystemLockedRole) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function setModuleAll(modulePerms: Permission[], on: boolean) {
    if (isSystemLockedRole) return;
    setChecked((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (on) next.add(p.code);
        else next.delete(p.code);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setMessage(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          permissions: [...checked],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to save permissions.",
        });
        return;
      }
      setMessage({
        type: "ok",
        text: `Saved ${data.count ?? checked.size} permissions for ${formatRoleLabel(selectedRole)} in the database.`,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <AdminPageHeader
        title="Roles & Permissions"
        subtitle="Each role shows only the permissions it has in the live system"
        icon={Shield}
        actions={
          isSystemLockedRole && !isSuperAdminRole ? null : (
          <AdminSaveButton
            label="Save"
            saving={saving}
            saved={saved}
            savingLabel="Saving…"
            savedLabel="Saved"
            onClick={save}
            className="!min-w-[9rem]"
          />
          )
        }
      />

      <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:gap-3 sm:overflow-visible sm:pb-0">
        <div className="min-w-[9rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Roles"
            value={stats.roles}
            hint="System roles"
            icon={Shield}
            tone="emerald"
          />
        </div>
        <div className="min-w-[9rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Catalog"
            value={stats.catalog}
            hint={
              selectedRole === "SUPER_ADMIN"
                ? "Full catalog"
                : "This role only"
            }
            icon={Database}
            tone="indigo"
          />
        </div>
        <div className="min-w-[9rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Granted"
            value={stats.granted}
            hint="Selected role"
            icon={Check}
            tone="teal"
          />
        </div>
        <div className="min-w-[9rem] flex-1 sm:min-w-0">
          <KpiCard
            label="Modules"
            value={stats.modules}
            hint="Permission groups"
            icon={Store}
            tone="amber"
          />
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-semibold",
            message.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {message.text}
        </p>
      ) : null}

      {isSystemLockedRole ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {formatRoleLabel(selectedRole)} — showing only this role&apos;s permissions
          (fixed by the system).
        </p>
      ) : null}

      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3  ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="mb-2">
          <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
            Select role
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => selectRole(r.role)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition",
                selectedRole === r.role
                  ? "border-[#0a5240] bg-[#0a5240] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              <Shield className="h-3.5 w-3.5" strokeWidth={2.25} />
              {formatRoleLabel(r.role)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm font-semibold text-slate-400">
          Loading roles & permissions…
        </p>
      ) : (
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Object.entries(grouped).map(([module, perms]) => {
            const meta = moduleMeta(module);
            const Icon = meta.icon;
            const enabledCount = perms.filter((p) => checked.has(p.code)).length;
            const allOn = enabledCount === perms.length && perms.length > 0;

            return (
              <section
                key={module}
                className={cn(
                  "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white ",
                  meta.tone
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-black/5 px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        meta.iconBg
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-800">
                        {meta.label}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500">
                        {enabledCount}/{perms.length} enabled
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModuleAll(perms, !allOn)}
                    disabled={isSystemLockedRole}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allOn ? "Clear" : "All"}
                  </button>
                </div>

                <div className="space-y-1.5 p-3">
                  {perms.map((p) => {
                    const on = checked.has(p.code);
                    return (
                      <label
                        key={p.code}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl border px-2.5 py-2 transition",
                          isSystemLockedRole ? "cursor-default" : "cursor-pointer",
                          on
                            ? "border-emerald-200 bg-emerald-50/80"
                            : "border-transparent bg-white/70 hover:border-slate-200 hover:bg-white"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                            on
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          )}
                        >
                          {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => toggle(p.code)}
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold text-slate-800">
                            {p.name}
                          </span>
                          <span className="block truncate font-mono text-[10px] font-medium text-slate-400">
                            {p.code}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
