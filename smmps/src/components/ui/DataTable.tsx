"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends { id?: number | string }>({
  columns,
  rows,
  searchable,
  onSearch,
  searchPlaceholder = "Search...",
  actions,
  emptyText = "No records found.",
  toolbar,
  onRefresh,
}: {
  columns: Column<T>[];
  rows: T[];
  searchable?: boolean;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: (row: T) => React.ReactNode;
  emptyText?: string;
  toolbar?: React.ReactNode;
  onRefresh?: () => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => onSearch?.(q), 300);
    return () => clearTimeout(t);
  }, [q, onSearch]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        {searchable && (
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          {toolbar}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[52rem] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500"
                >
                  {c.header}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 text-slate-700", c.className)}>
                    {c.render
                      ? c.render(row)
                      : String((row as Record<string, unknown>)[c.key] ?? "—")}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[min(92vh,56rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
