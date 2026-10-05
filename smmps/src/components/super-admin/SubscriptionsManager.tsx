"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  CircleCheck,
  Clock,
  CreditCard,
  MoreHorizontal,
  Plus,
  Power,
  Pencil,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui/DataTable";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { AdminPageHeader, KpiCard } from "@/components/super-admin/AdminPagePrimitives";
import { useConfirmDialog } from "@/components/super-admin/ConfirmDialog";
import { useActionMessage } from "@/components/super-admin/use-action-message";
import { cn } from "@/lib/utils";
import { useUrlTab } from "@/lib/use-url-tab";
import { useLang } from "@/lib/language-context";
import { formatStatusLabel } from "@/lib/smlpms-constants";
import { planCardOrder, planColorName, planDurationChoiceLabel } from "@/lib/pricing-plans";
import { registrationDocumentUrl } from "@/lib/registration-document-url";

type RenewalProof = {
  id: number;
  receiptFile: string;
  createdAt: string;
  requestedPlanId?: number | null;
  requestedPlan?: {
    id: number;
    name: string;
    price: string;
    durationDays: number;
  } | null;
  subscription: {
    plan: { name: string; price: string; durationDays: number };
    company: { name: string } | null;
    broker: { name: string } | null;
  };
};

type Plan = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  durationDays: number;
  accountType: string;
  maxMarkets: number | null;
  maxLivestockTypes: number | null;
  active: boolean;
};

type Subscription = {
  id: number;
  status: string;
  startDate: string;
  expiryDate: string;
  plan: Plan;
  company: { id: number; name: string } | null;
  broker: { id: number; name: string } | null;
};

type AccountKind = "company" | "broker";

type AccountOpt = {
  id: number;
  name: string;
  kind: AccountKind;
  sector?: "water" | "electricity" | "company";
  typeLabel: string;
  searchText: string;
};

type AccountRow = {
  key: string;
  kind: AccountKind;
  sector?: "water" | "electricity" | "company";
  accountId: number;
  name: string;
  typeLabel: string;
  searchText: string;
  subscription: Subscription | null;
};

type StatusFilter = "" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
type KindFilter = "" | "water" | "electricity" | "broker";

const filterSelectClass =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

function PlanRowActionsMenu({
  open,
  onOpenChange,
  active,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setCoords(null);
      return;
    }
    function place() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuW = 200;
      const menuH = 168;
      const gap = 8;
      const openUp = window.innerHeight - rect.bottom < menuH + gap + 12;
      const top = openUp ? rect.top - gap : rect.bottom + gap;
      const left = Math.max(12, Math.min(rect.right - menuW, window.innerWidth - menuW - 12));
      setCoords({ top, left, openUp });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const menu =
    open &&
    coords &&
    createPortal(
      <div
        className={cn(
          "fixed z-[200] w-[200px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-lg ring-1 ring-slate-900/[0.04]",
          coords.openUp ? "-translate-y-full" : ""
        )}
        style={{ top: coords.top, left: coords.left }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          onClick={onEdit}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-sky-800 outline-none transition hover:bg-sky-50 disabled:opacity-50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          Edit
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold outline-none transition disabled:opacity-50",
            active
              ? "text-amber-900 hover:bg-amber-50"
              : "text-emerald-800 hover:bg-emerald-50"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"
            )}
          >
            <Power className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          {active ? "Deactivate" : "Activate"}
        </button>
        <div className="my-1 h-px bg-slate-100" />
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          onClick={onDelete}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-rose-700 outline-none transition hover:bg-rose-50 disabled:opacity-50"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          Delete
        </button>
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-50",
          open
            ? "border-slate-300 bg-slate-100 text-slate-700"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
        )}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {menu}
    </>
  );
}

function StatusChip({ status }: { status: string }) {
  const key = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide",
        key === "ACTIVE"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : key === "EXPIRING_SOON"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : key === "EXPIRED"
              ? "border-slate-200 bg-slate-100 text-slate-700"
              : key === "NONE"
                ? "border-sky-200 bg-sky-50 text-sky-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      {status.replace(/_/g, " ") === "NONE" ? "No plan" : status.replace(/_/g, " ")}
    </span>
  );
}

export function SubscriptionsManager() {
  const { lang } = useLang();
  const { confirm, dialog } = useConfirmDialog();
  const [tab, setTab] = useUrlTab(
    ["subscriptions", "plans", "payments"] as const,
    "subscriptions"
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [renewals, setRenewals] = useState<RenewalProof[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<AccountOpt[]>([]);
  const [brokers, setBrokers] = useState<AccountOpt[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("");
  const [searchDraft, setSearchDraft] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [assign, setAssign] = useState({
    planId: "",
    target: "company",
    companyId: "",
    brokerId: "",
    days: "365",
  });
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: "",
    durationDays: "365",
    accountType: "ALL",
    maxMarkets: "",
    maxLivestockTypes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useActionMessage(2000);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/subscriptions?view=plans"),
      ]);
      const s = await sRes.json().catch(() => ({}));
      const p = await pRes.json().catch(() => ({}));
      setPlans(p.plans || []);
      if (!sRes.ok) {
        setActionMessage({
          type: "error",
          text: s.error || "Failed to load subscriptions.",
        });
        setSubscriptions([]);
        setRenewals([]);
        setCompanies([]);
        setBrokers([]);
      } else {
        setSubscriptions(s.subscriptions || []);
        setRenewals(s.renewals || []);
        setCompanies(
          (s.companies || []).map(
            (x: { id: number; name: string; type?: string; slug?: string }) => {
              const typeLabel =
                x.type === "WATER_SUPPLY"
                  ? "Water company"
                  : x.type === "ELECTRICITY"
                    ? "Electricity company"
                    : "Company";
              const sector =
                x.type === "WATER_SUPPLY"
                  ? "water"
                  : x.type === "ELECTRICITY"
                    ? "electricity"
                    : "company";
              return {
                id: x.id,
                name: x.name,
                kind: "company" as const,
                sector,
                typeLabel,
                searchText: [x.name, x.slug, typeLabel, "company", sector].join(" "),
              };
            }
          )
        );
        setBrokers(
          (s.brokers || []).map(
            (x: {
              id: number;
              name: string;
              email?: string | null;
              livestockFocus?: string | null;
            }) => {
              const typeLabel = x.livestockFocus
                ? `Livestock broker · ${x.livestockFocus}`
                : "Livestock broker";
              return {
                id: x.id,
                name: x.name,
                kind: "broker" as const,
                typeLabel,
                searchText: [x.name, x.email, typeLabel, "broker"].join(" "),
              };
            }
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (menuOpenId == null) return;
    function close() {
      setMenuOpenId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    const timer = window.setTimeout(() => document.addEventListener("click", close), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  const accountRows = useMemo<AccountRow[]>(() => {
    const latestByCompany = new Map<number, Subscription>();
    const latestByBroker = new Map<number, Subscription>();
    for (const sub of subscriptions) {
      if (sub.company?.id && !latestByCompany.has(sub.company.id)) {
        latestByCompany.set(sub.company.id, sub);
      }
      if (sub.broker?.id && !latestByBroker.has(sub.broker.id)) {
        latestByBroker.set(sub.broker.id, sub);
      }
    }
    return [
      ...companies.map((c) => ({
        key: `company-${c.id}`,
        kind: "company" as const,
        sector: c.sector,
        accountId: c.id,
        name: c.name,
        typeLabel: c.typeLabel,
        searchText: c.searchText,
        subscription: latestByCompany.get(c.id) || null,
      })),
      ...brokers.map((b) => ({
        key: `broker-${b.id}`,
        kind: "broker" as const,
        accountId: b.id,
        name: b.name,
        typeLabel: b.typeLabel,
        searchText: b.searchText,
        subscription: latestByBroker.get(b.id) || null,
      })),
    ];
  }, [companies, brokers, subscriptions]);

  const stats = useMemo(
    () => ({
      total: accountRows.length,
      active: accountRows.filter((r) => r.subscription?.status === "ACTIVE").length,
      expiring: accountRows.filter((r) => r.subscription?.status === "EXPIRING_SOON").length,
    }),
    [accountRows]
  );

  const filteredRows = useMemo(() => {
    const tokens = searchDraft
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return accountRows.filter((row) => {
      if (kindFilter === "broker" && row.kind !== "broker") return false;
      if (kindFilter === "water" && row.sector !== "water") return false;
      if (kindFilter === "electricity" && row.sector !== "electricity") return false;
      if (!row.subscription) return false;
      if (statusFilter) {
        if (row.subscription?.status !== statusFilter) return false;
      }
      if (!tokens.length) return true;
      const hay = [
        row.searchText,
        row.subscription?.plan.name || "",
        row.subscription?.status || "none no plan",
      ]
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => hay.includes(token));
    });
  }, [accountRows, searchDraft, kindFilter, statusFilter]);

  const filteredPlans = useMemo(() => {
    const tokens = searchDraft
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const list = !tokens.length
      ? plans
      : plans.filter((p) => {
          const hay = [p.name, p.accountType, p.description || ""].join(" ").toLowerCase();
          return tokens.every((token) => hay.includes(token));
        });
    const sectorRank = (accountType: string) => {
      const type = accountType.trim().toUpperCase();
      if (type === "LIVESTOCK" || type === "BROKER") return 0;
      if (type === "ELECTRICITY") return 1;
      if (type === "WATER") return 2;
      return 3;
    };
    return [...list].sort(
      (a, b) =>
        sectorRank(a.accountType) - sectorRank(b.accountType) ||
        planCardOrder(a) - planCardOrder(b) ||
        a.id - b.id
    );
  }, [plans, searchDraft]);

  function applySearch() {
    setSearchDraft((prev) => prev.trim());
  }

  async function assignSubscription() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        action: "assign",
        planId: Number(assign.planId),
      };
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + Number(assign.days || 365));
      body.startDate = startDate.toISOString();
      body.expiryDate = expiryDate.toISOString();
      if (assign.target === "company") body.companyId = Number(assign.companyId);
      else body.brokerId = Number(assign.brokerId);

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Failed to assign");
        return;
      }
      setAssignOpen(false);
      setActionMessage({ type: "ok", text: "Subscription assigned." });
      await load();
    } finally {
      setSaving(false);
    }
  }

  function openAssign(row?: AccountRow) {
    setAssign({
      planId: plans[0] ? String(plans[0].id) : "",
      target: row?.kind === "broker" ? "broker" : "company",
      companyId: row?.kind === "company" ? String(row.accountId) : "",
      brokerId: row?.kind === "broker" ? String(row.accountId) : "",
      days: "365",
    });
    setError("");
    setAssignOpen(true);
  }

  function emptyPlanForm() {
    return {
      name: "",
      description: "",
      price: "",
      durationDays: "90",
      accountType: "ALL",
      maxMarkets: "",
      maxLivestockTypes: "",
    };
  }

  function openNewPlan() {
    setError("");
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
    setPlanOpen(true);
  }

  function openEditPlan(p: Plan) {
    setError("");
    setEditingPlanId(p.id);
    setPlanForm({
      name: planColorName(p.price, p.durationDays, "en"),
      description: p.description || "",
      price: String(p.price),
      durationDays: String(p.durationDays),
      accountType: p.accountType,
      maxMarkets: p.maxMarkets != null ? String(p.maxMarkets) : "",
      maxLivestockTypes: p.maxLivestockTypes != null ? String(p.maxLivestockTypes) : "",
    });
    setPlanOpen(true);
  }

  async function savePlan() {
    if (planForm.price.trim() === "" || !Number.isFinite(Number(planForm.price))) {
      setError("Enter a price. Use 0 for a Free plan.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const scopePayload = {
        maxMarkets: planForm.maxMarkets.trim() === "" ? null : Number(planForm.maxMarkets),
        maxLivestockTypes:
          planForm.maxLivestockTypes.trim() === "" ? null : Number(planForm.maxLivestockTypes),
      };
      const res = await fetch("/api/subscriptions", {
        method: editingPlanId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingPlanId
            ? {
                action: "update_plan",
                id: editingPlanId,
                name: planColorName(planForm.price, Number(planForm.durationDays) || 0, "en"),
                description: planForm.description,
                price: Number(planForm.price),
                durationDays: Number(planForm.durationDays),
                accountType: planForm.accountType,
                ...scopePayload,
              }
            : {
                action: "create_plan",
                name: planColorName(planForm.price, Number(planForm.durationDays) || 0, "en"),
                description: planForm.description,
                price: Number(planForm.price),
                durationDays: Number(planForm.durationDays),
                accountType: planForm.accountType,
                ...scopePayload,
              }
        ),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || (editingPlanId ? "Failed to update plan" : "Failed to create plan"));
        return;
      }
      setPlanOpen(false);
      setEditingPlanId(null);
      setPlanForm(emptyPlanForm());
      setActionMessage({
        type: "ok",
        text: editingPlanId ? "Plan updated." : "Plan created.",
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(p: Plan) {
    const ok = await confirm({
      title: "Delete plan?",
      description: p.active
        ? "Deactivate this plan first, or delete only if no subscriptions use it."
        : "This plan will be removed if it is not assigned to any account.",
      confirmLabel: "Delete plan",
      tone: "danger",
    });
    if (!ok) return;
    setActionBusyId(p.id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, action: "delete_plan" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to delete plan.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Plan deleted." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function extend(id: number) {
    setActionBusyId(id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "extend", days: 30 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to extend subscription.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Subscription extended by 30 days." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function cancel(id: number) {
    const ok = await confirm({
      title: "Cancel subscription?",
      description: "This subscription will be cancelled and the account will lose paid access.",
      confirmLabel: "Cancel subscription",
      tone: "warning",
    });
    if (!ok) return;
    setActionBusyId(id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to cancel subscription.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Subscription cancelled." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function togglePlan(id: number) {
    setActionBusyId(id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle_plan" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to update plan.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Plan status updated." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function reactivate(id: number) {
    const ok = await confirm({
      title: "Reactivate subscription?",
      description: "This account will regain paid access. If the plan already expired, 30 days will be added from today.",
      confirmLabel: "Reactivate",
      tone: "primary",
    });
    if (!ok) return;
    setActionBusyId(id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reactivate", days: 30 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to reactivate subscription.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Subscription reactivated." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  async function approveRenewal(id: number) {
    setActionBusyId(id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve_renewal" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: d.error || "Failed to approve the payment notice.",
        });
        return;
      }
      setActionMessage({ type: "ok", text: "Payment accepted. The account is open again." });
      await load();
    } finally {
      setActionBusyId(null);
    }
  }

  const headerActionClass =
    "inline-flex h-11 w-[13.5rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0a5240] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#083f31]";
  const tabBtnClass = (active: boolean) =>
    cn(
      "inline-flex h-9 min-w-[6.75rem] items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition",
      active ? "bg-[#0a5240] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
    );
  const rowActionClass =
    "inline-flex h-9 min-w-[6.75rem] items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mx-auto w-full max-w-none space-y-4">
      <AdminPageHeader
        title="Subscriptions"
        subtitle={
          tab === "payments"
            ? "Renewal payments from expired accounts waiting for review"
            : tab === "plans"
              ? "Manage pricing plans for companies and brokers"
              : "Every company and livestock broker in the system"
        }
        icon={CreditCard}
        actions={
          <div className="flex h-11 shrink-0 items-center gap-2">
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setTab("subscriptions")}
                className={tabBtnClass(tab === "subscriptions")}
              >
                Subscriptions
              </button>
              <button
                type="button"
                onClick={() => setTab("payments")}
                className={tabBtnClass(tab === "payments")}
              >
                Payments
                {renewals.length > 0 ? (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black",
                      tab === "payments"
                        ? "bg-white/20 text-white"
                        : "bg-amber-500 text-white"
                    )}
                  >
                    {renewals.length}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setTab("plans")}
                className={tabBtnClass(tab === "plans")}
              >
                Plans
              </button>
            </div>
            {tab === "subscriptions" ? (
              <button
                type="button"
                onClick={() => openAssign()}
                className={headerActionClass}
              >
                <CreditCard className="h-4 w-4" strokeWidth={2.25} />
                Assign Subscription
              </button>
            ) : tab === "plans" ? (
              <button
                type="button"
                onClick={openNewPlan}
                className={headerActionClass}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                New Plan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void load()}
                className={headerActionClass}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
                Refresh
              </button>
            )}
          </div>
        }
      />

      {tab === "subscriptions" ? (
        <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:gap-3 sm:overflow-visible sm:pb-0">
          <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
            <KpiCard
              label="Total"
              value={stats.total}
              hint="Companies & brokers"
              icon={CreditCard}
              tone="indigo"
              onClick={() => {
                setStatusFilter("");
                setKindFilter("");
              }}
            />
          </div>
          <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
            <KpiCard
              label={formatStatusLabel("ACTIVE", lang)}
              value={stats.active}
              hint="In good standing"
              icon={CircleCheck}
              tone="emerald"
              onClick={() => setStatusFilter("ACTIVE")}
            />
          </div>
          <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
            <KpiCard
              label="Expiring"
              value={stats.expiring}
              hint="Soon to lapse"
              icon={Clock}
              tone="amber"
              onClick={() => setStatusFilter("EXPIRING_SOON")}
            />
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:gap-3 sm:overflow-visible sm:pb-0">
          <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
            <KpiCard
              label="Waiting"
              value={renewals.length}
              hint="Payment notices to review"
              icon={Clock}
              tone="amber"
            />
          </div>
          <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
            <KpiCard
              label="EVC"
              value={renewals.filter((p) =>
                String(p.receiptFile || "").includes("evc")
              ).length}
              hint="Phone charges"
              icon={Smartphone}
              tone="emerald"
            />
          </div>
          <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
            <KpiCard
              label="Card"
              value={renewals.filter((p) =>
                /mastercard|visa/i.test(String(p.receiptFile || ""))
              ).length}
              hint="MasterCard and Visa notices"
              icon={CreditCard}
              tone="indigo"
            />
          </div>
        </div>
      ) : null}

      {tab !== "payments" ? (
      <div className="w-full rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-3  ring-1 ring-emerald-900/[0.04] sm:p-3.5">
        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder={
                  tab === "subscriptions"
                    ? "Search account or plan…"
                    : "Search plans…"
                }
                className="h-11 w-full min-w-0 bg-transparent pl-10 pr-3 text-[14px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-11 shrink-0 items-center gap-2 border-l border-slate-200 bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search
            </button>
          </div>

          {tab === "subscriptions" ? (
            <>
            <div className="relative w-full sm:w-[11.5rem]">
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as KindFilter)}
                className={filterSelectClass}
                aria-label="Filter by account type"
              >
                <option value="">All accounts</option>
                <option value="water">Water</option>
                <option value="electricity">Electricity</option>
                <option value="broker">Brokers</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                strokeWidth={2.25}
              />
            </div>
            <div className="relative w-full sm:w-[11.5rem]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={filterSelectClass}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">{formatStatusLabel("ACTIVE", lang)}</option>
                <option value="EXPIRING_SOON">{formatStatusLabel("EXPIRING_SOON", lang)}</option>
                <option value="EXPIRED">{formatStatusLabel("EXPIRED", lang)}</option>
                <option value="CANCELLED">{formatStatusLabel("CANCELLED", lang)}</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                strokeWidth={2.25}
              />
            </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              if (tab === "subscriptions") {
                setStatusFilter("");
                setKindFilter("");
              }
              void load();
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
            Refresh
          </button>
        </div>
      </div>
      ) : null}

      <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white ">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800">
              {tab === "payments"
                ? "Payment notices"
                : tab === "subscriptions"
                  ? "Companies & brokers"
                  : "Subscription plans"}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {tab === "payments"
                ? `${renewals.length} waiting for Super Admin review`
                : tab === "subscriptions"
                  ? `${filteredRows.length} shown · ${companies.length} companies · ${brokers.length} brokers`
                  : `${filteredPlans.length} shown`}
            </p>
          </div>
          {actionMessage ? (
            <p
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                actionMessage.type === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {actionMessage.text}
            </p>
          ) : null}
        </div>

        {tab === "payments" ? (
          <div className="space-y-3 p-4">
            {loading ? (
              <p className="py-14 text-center text-sm font-semibold text-slate-400">
                Loading payment notices…
              </p>
            ) : renewals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-14 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  No payment notices waiting
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  When an expired account pays again (EVC, MasterCard, or Visa), it appears here.
                </p>
              </div>
            ) : (
              renewals.map((proof) => {
                const account =
                  proof.subscription.company?.name ||
                  proof.subscription.broker?.name ||
                  "Account";
                const methodToken = String(proof.receiptFile || "");
                const method =
                  methodToken.startsWith("method:mastercard") ||
                  methodToken === "mastercard"
                    ? "MasterCard"
                    : methodToken.startsWith("method:visa") || methodToken === "visa"
                      ? "Visa"
                    : methodToken.startsWith("method:evc") || methodToken === "evc"
                      ? "EVC Plus"
                      : methodToken.startsWith("method:free") || methodToken === "free"
                        ? "Free"
                        : null;
                const parts = methodToken.includes("|")
                  ? methodToken.split("|")
                  : [];
                const cardHint =
                  (method === "MasterCard" || method === "Visa") && parts.length >= 3
                    ? parts.slice(1, 3).join(" · ")
                    : method === "EVC Plus" && parts.length >= 2
                      ? `Tx ${parts[1]}${parts[3] ? ` · $${parts[3]}` : ""}`
                      : "";
                const receiptUrl = method
                  ? null
                  : registrationDocumentUrl(proof.receiptFile);
                const image =
                  !method && /\.(png|jpe?g|webp|gif)$/i.test(proof.receiptFile);
                return (
                  <div
                    key={proof.id}
                    className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 sm:grid-cols-[160px_1fr_auto] sm:items-center"
                  >
                    {method ? (
                      <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg bg-white px-2 text-center text-sm font-black text-amber-900 ring-1 ring-amber-100">
                        <span className="inline-flex items-center gap-1.5">
                          {method === "EVC Plus" ? (
                            <Smartphone className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-slate-700" />
                          )}
                          {method}
                        </span>
                        {cardHint ? (
                          <span className="text-[11px] font-semibold text-amber-800/80">
                            {cardHint}
                          </span>
                        ) : null}
                      </div>
                    ) : image && receiptUrl ? (
                      <a href={receiptUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={receiptUrl}
                          alt="Payment receipt"
                          className="h-28 w-full rounded-lg object-cover"
                        />
                      </a>
                    ) : receiptUrl ? (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-amber-900"
                      >
                        Open receipt
                      </a>
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                        Payment
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-slate-900">{account}</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {planColorName(
                          (proof.requestedPlan || proof.subscription.plan).price,
                          (proof.requestedPlan || proof.subscription.plan).durationDays,
                          "en"
                        )} · $
                        {Number(
                          (proof.requestedPlan || proof.subscription.plan).price
                        )}{" "}
                        · {(proof.requestedPlan || proof.subscription.plan).durationDays}{" "}
                        days
                        {method ? ` · ${method}` : ""}
                      </p>
                      {proof.requestedPlan &&
                      proof.requestedPlan.name !== proof.subscription.plan.name ? (
                        <p className="mt-1 text-[11px] font-medium text-amber-800">
                          Previous plan: {planColorName(proof.subscription.plan.price, proof.subscription.plan.durationDays, "en")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] font-medium text-slate-500">
                        Submitted{" "}
                        {new Date(proof.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actionBusyId === proof.id}
                      onClick={() => void approveRenewal(proof.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Approve and reopen
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : tab === "subscriptions" ? (
          <div className="mmps-table-scroll">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <colgroup>
                <col style={{ width: "24%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "24%" }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-100 px-4 py-3.5">Account</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Plan</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Start</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Expiry</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Status</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                      Loading subscriptions…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                      No companies or brokers found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const s = row.subscription;
                    return (
                    <tr
                      key={row.key}
                      className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {row.name}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {row.typeLabel}
                        </p>
                      </td>
                      <td className="truncate px-3 py-3.5 text-[13px] font-semibold text-slate-700">
                        {s ? planColorName(s.plan.price, s.plan.durationDays, "en") : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-[12px] font-medium text-slate-600">
                        {s ? s.startDate.slice(0, 10) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-[12px] font-medium text-slate-600">
                        {s ? s.expiryDate.slice(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <StatusChip status={s?.status || "NONE"} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {!s || s.status === "CANCELLED" ? (
                            <button
                              type="button"
                              disabled={actionBusyId === s?.id}
                              onClick={() =>
                                s?.status === "CANCELLED"
                                  ? void reactivate(s.id)
                                  : openAssign(row)
                              }
                              className={cn(
                                rowActionClass,
                                "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                              )}
                              title={s ? "Reactivate subscription" : "Assign subscription"}
                            >
                              <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
                              {s ? "Reactivate" : "Assign"}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={actionBusyId === s.id}
                                onClick={() => void extend(s.id)}
                                className={cn(
                                  rowActionClass,
                                  "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                )}
                                title={
                                  s.status === "EXPIRED"
                                    ? "Renew for 30 days"
                                    : "Extend 30 days"
                                }
                              >
                                <Clock className="h-3.5 w-3.5" strokeWidth={2.25} />
                                {s.status === "EXPIRED" ? "Renew 30d" : "Extend 30d"}
                              </button>
                              <button
                                type="button"
                                disabled={actionBusyId === s.id}
                                onClick={() => void cancel(s.id)}
                                className={cn(
                                  rowActionClass,
                                  "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                )}
                                title="Cancel subscription"
                              >
                                <XCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mmps-table-scroll">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <colgroup>
                <col style={{ width: "24%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-100 px-4 py-3.5">Plan</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Price</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Duration</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Account type</th>
                  <th className="border-b border-slate-100 px-3 py-3.5">Livestock scope</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Status</th>
                  <th className="border-b border-slate-100 px-3 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                      Loading plans…
                    </td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                      No plans.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {planColorName(p.price, p.durationDays, "en")}
                        </p>
                        {p.description ? (
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {p.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5 text-[13px] font-bold tabular-nums text-slate-800">
                        {Number(p.price) <= 0 ? "Free" : `$${p.price}`}
                      </td>
                      <td className="px-3 py-3.5 text-[12px] font-medium text-slate-600">
                        {Number(p.price) <= 0 ? "1 Month" : planDurationChoiceLabel(p.durationDays, "en")}
                      </td>
                      <td className="px-3 py-3.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                        {p.accountType}
                      </td>
                      <td className="px-3 py-3.5 text-[12px] font-medium text-slate-600">
                        {p.accountType === "LIVESTOCK" || p.accountType === "BROKER" ? (
                          <>
                            <span className="block">
                              Markets: {p.maxMarkets == null ? "All" : p.maxMarkets}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              Types: {p.maxLivestockTypes == null ? "All" : p.maxLivestockTypes}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <StatusChip status={p.active ? "ACTIVE" : "INACTIVE"} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex justify-center">
                          <PlanRowActionsMenu
                            open={menuOpenId === p.id}
                            onOpenChange={(open) => setMenuOpenId(open ? p.id : null)}
                            active={p.active}
                            busy={actionBusyId === p.id}
                            onEdit={() => {
                              setMenuOpenId(null);
                              openEditPlan(p);
                            }}
                            onToggle={() => {
                              setMenuOpenId(null);
                              void togglePlan(p.id);
                            }}
                            onDelete={() => {
                              setMenuOpenId(null);
                              void deletePlan(p);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Subscription"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAssignOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <AdminSaveButton
              label="Assign"
              saving={saving}
              savingLabel="Assigning…"
              onClick={assignSubscription}
              className="!min-w-[8.5rem]"
            />
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <Field label="Plan">
            <select
              className={inputCls}
              value={assign.planId}
              onChange={(e) => setAssign({ ...assign, planId: e.target.value })}
            >
              <option value="">Select plan</option>
              {[...plans]
                .filter((p) => p.active)
                .sort(
                  (a, b) => planCardOrder(a) - planCardOrder(b) || a.accountType.localeCompare(b.accountType)
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {planColorName(p.price, p.durationDays, "en")} · {p.accountType} · ${p.price}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Account type">
            <select
              className={inputCls}
              value={assign.target}
              onChange={(e) => setAssign({ ...assign, target: e.target.value })}
            >
              <option value="company">Company</option>
              <option value="broker">Livestock Broker</option>
            </select>
          </Field>
          {assign.target === "company" ? (
            <Field label="Company">
              <select
                className={inputCls}
                value={assign.companyId}
                onChange={(e) => setAssign({ ...assign, companyId: e.target.value })}
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Broker">
              <select
                className={inputCls}
                value={assign.brokerId}
                onChange={(e) => setAssign({ ...assign, brokerId: e.target.value })}
              >
                <option value="">Select broker</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Duration (days)">
            <input
              className={inputCls}
              type="number"
              value={assign.days}
              onChange={(e) => setAssign({ ...assign, days: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title={editingPlanId ? "Edit Subscription Plan" : "New Subscription Plan"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPlanOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <AdminSaveButton
              label={editingPlanId ? "Save" : "Create"}
              saving={saving}
              onClick={savePlan}
              className="!min-w-[8.5rem]"
            />
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <Field label="Plan name">
            <input
              className={inputCls}
              readOnly
              placeholder="Set a price first"
              value={
                planForm.price.trim() === ""
                  ? ""
                  : planColorName(planForm.price, Number(planForm.durationDays) || 0, "en")
              }
            />
          </Field>
          <Field label="Description">
            <textarea
              className={inputCls}
              rows={2}
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (USD)">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
              />
            </Field>
            <Field label="Duration (days)">
              <input
                className={inputCls}
                type="number"
                value={planForm.durationDays}
                onChange={(e) =>
                  setPlanForm({ ...planForm, durationDays: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Account type">
            <select
              className={inputCls}
              value={planForm.accountType}
              onChange={(e) => {
                const accountType = e.target.value;
                const isLivestock = accountType === "LIVESTOCK" || accountType === "BROKER";
                setPlanForm({
                  ...planForm,
                  accountType,
                  ...(isLivestock
                    ? {}
                    : { maxMarkets: "", maxLivestockTypes: "" }),
                });
              }}
            >
              <option value="ALL">All</option>
              <option value="WATER">Water</option>
              <option value="ELECTRICITY">Electricity</option>
              <option value="LIVESTOCK">Livestock</option>
            </select>
          </Field>
          {planForm.accountType === "LIVESTOCK" || planForm.accountType === "BROKER" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
              Livestock broker limits
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-900/80">
              Leave empty for unlimited. Example: Free = 1 market + 1 type; Mid = 2 + 2; Full = empty.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Max markets">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  placeholder="All"
                  value={planForm.maxMarkets}
                  onChange={(e) => setPlanForm({ ...planForm, maxMarkets: e.target.value })}
                />
              </Field>
              <Field label="Max livestock types">
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  placeholder="All"
                  value={planForm.maxLivestockTypes}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, maxLivestockTypes: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>
          ) : null}
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
