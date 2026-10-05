"use client";

import { Beef, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrokerUserRow = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  accountStatus?: string;
  companyType?: string | null;
  companyName?: string | null;
  createdAt: string;
};

function RoleChip({ role: _role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-800">
      Broker
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const ok = status === "APPROVED" || status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-900"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function BrokerUsersTable({
  rows,
  sectionLabel,
  sectionFocus,
}: {
  rows: BrokerUserRow[];
  sectionLabel: string;
  sectionFocus?: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Users & Roles</h2>
          <p className="text-sm text-slate-500">
            Real registrants for{" "}
            <span className="font-semibold text-slate-700">{sectionLabel}</span>
            {sectionFocus ? ` · ${sectionFocus}` : ""} — from the register page
            (Camel, Cattle, Goat only).
          </p>
        </div>
        <p className="text-[12px] font-semibold text-slate-500">
          {rows.length} {rows.length === 1 ? "user" : "users"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-100 px-4 py-3.5">User</th>
                <th className="border-b border-slate-100 px-3 py-3.5">Section</th>
                <th className="border-b border-slate-100 px-3 py-3.5">Role</th>
                <th className="border-b border-slate-100 px-3 py-3.5 text-center">
                  Status
                </th>
                <th className="border-b border-slate-100 px-3 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center text-sm font-semibold text-slate-400"
                  >
                    No Camel / Cattle / Goat registrants linked yet. After Super
                    Admin approves a register application for this section, they
                    appear here and can sign in to submit prices.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                          <UserRound className="h-5 w-5" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-slate-900">
                            {u.fullName}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-900">
                        <Beef className="h-3.5 w-3.5" strokeWidth={2.25} />
                        {u.companyType || sectionLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <RoleChip role={u.role} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatusChip status={u.accountStatus || u.status} />
                    </td>
                    <td className="px-3 py-3.5 text-[12px] font-medium text-slate-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
