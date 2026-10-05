"use client";

import { useEffect, useMemo, useState } from "react";
import { Beef, Droplets, Zap, Plus, CheckCircle } from "lucide-react";
import {
  ANIMAL_TYPES,
  WATER_TYPES,
  ELECTRICITY_TYPES,
} from "@/lib/constants";
import {
  companySectorForSlug,
  providerMetaForSlug,
} from "@/lib/company-scope";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { AdminSaveButton } from "@/components/ui/AdminSaveButton";
import { cn } from "@/lib/utils";

type Sector = "livestock" | "water" | "electricity";

const sectorConfig = {
  livestock: {
    icon: Beef,
    label: "Livestock",
    color: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  water: {
    icon: Droplets,
    label: "Water Supply",
    color: "border-blue-500 bg-blue-50 text-blue-700",
  },
  electricity: {
    icon: Zap,
    label: "Electricity",
    color: "border-amber-500 bg-amber-50 text-amber-700",
  },
};

export function AdminPriceEntryForm({
  companySlug,
  lockedCompany,
  embedded = false,
  onSuccess,
}: {
  companySlug?: string | null;
  lockedCompany?: {
    sector: Sector;
    name: string;
    acronym?: string;
  } | null;
  embedded?: boolean;
  logoUrl?: string | null;
  onSuccess?: (payload: { price: number; sector: Sector }) => void;
}) {
  const locked = useMemo(() => {
    // Prefer catalog meta name so every company saves/reports the same canonical provider
    if (companySlug) {
      const sector = companySectorForSlug(companySlug);
      const meta = providerMetaForSlug(companySlug);
      if (sector && meta) {
        return {
          sector,
          name: meta.name,
          acronym: meta.acronym ?? lockedCompany?.acronym ?? meta.name,
        };
      }
    }
    return lockedCompany ?? null;
  }, [companySlug, lockedCompany]);

  const [sector, setSector] = useState<Sector>(locked?.sector ?? "livestock");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState("");

  useEffect(() => {
    if (!message && !error) return;
    const ms = message === "Saved successfully" ? 2800 : 3200;
    const id = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, ms);
    return () => window.clearTimeout(id);
  }, [message, error]);

  const activeSector = locked?.sector ?? sector;
  const availableSectors = locked
    ? ([locked.sector] as Sector[])
    : (["livestock", "water", "electricity"] as Sector[]);
  const year = new Date().getFullYear();

  async function handleLockedCurrentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locked) return;
    setLoading(true);
    setMessage("");
    setError("");
    const startedAt = Date.now();

    const price = Number(currentPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setLoading(false);
      setError("Enter a valid current price.");
      return;
    }

    const endpoint =
      activeSector === "water" ? "/api/water" : "/api/electricity";
    const serviceType =
      activeSector === "water"
        ? WATER_TYPES[0]!.value
        : ELECTRICITY_TYPES[0]!.value;

    try {
      const body =
        activeSector === "water"
          ? {
              providerName: locked.name,
              waterType: serviceType,
              pricePerUnit: price,
            }
          : {
              providerName: locked.name,
              serviceType,
              pricePerKwh: price,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save price");
        setLoading(false);
        return;
      }

      const wait = Math.max(0, 500 - (Date.now() - startedAt));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      setMessage("Saved successfully");
      setCurrentPrice("");
      onSuccess?.({ price, sector: activeSector });
    } catch {
      setError("Failed to save prices");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    form.forEach((v, k) => {
      body[k] = String(v);
    });

    if (locked) {
      body.providerName = locked.name;
      if (activeSector === "livestock") {
        body.marketLocation = locked.name;
      }
    }

    const endpoints = {
      livestock: "/api/livestock/prices",
      water: "/api/water",
      electricity: "/api/electricity",
    };

    const res = await fetch(endpoints[activeSector], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to add record");
      return;
    }

    const price =
      Number(body.pricePerKwh ?? body.pricePerUnit ?? body.price ?? 0) || 0;

    setMessage("Saved successfully");
    (e.target as HTMLFormElement).reset();
    onSuccess?.({ price, sector: activeSector });
  }

  if (locked && (activeSector === "electricity" || activeSector === "water")) {
    const isElectricity = activeSector === "electricity";
    const justSaved = message === "Saved successfully";
    return (
      <form
        onSubmit={handleLockedCurrentSubmit}
        className="mx-auto w-full max-w-2xl space-y-6"
      >
        <div className="w-full">
          <label className="mb-2.5 block text-center text-[13px] font-bold tracking-wide text-slate-700 sm:text-[14px]">
            {isElectricity
              ? `Current kWh (USD) · ${year}`
              : `Current price / m³ (USD) · ${year}`}
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            required
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            placeholder={isElectricity ? "e.g. 0.41" : "e.g. 15.00"}
            className="h-16 w-full rounded-2xl border-slate-200 bg-white px-5 text-center text-2xl font-bold tabular-nums text-slate-900 shadow-sm sm:h-[4.25rem]"
          />
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          {error ? (
            <p className="min-h-[1.25rem] text-center text-sm font-bold text-red-600">
              {error}
            </p>
          ) : (
            <p className="min-h-[1.25rem]" aria-hidden />
          )}
          <AdminSaveButton
            type="submit"
            label={`Save ${locked.acronym} · ${year}`}
            saving={loading}
            saved={justSaved}
            fullWidth
          />
        </div>
      </form>
    );
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeSector === "livestock" && (
        <>
          <Select
            label="Animal Type"
            name="animalType"
            required
            options={ANIMAL_TYPES.map((a) => ({
              value: a.value,
              label: a.label,
            }))}
          />
          <Input
            label="Price (USD)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
          />
        </>
      )}

      {activeSector === "water" && (
        <>
          <Input
            label="Provider Name"
            name="providerName"
            required
            placeholder="e.g. Mogadishu Water Co."
          />
          <input type="hidden" name="waterType" value={WATER_TYPES[0]!.value} />
          <Input
            label={`Price Per Unit (USD) · ${year}`}
            name="pricePerUnit"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
          />
        </>
      )}

      {activeSector === "electricity" && (
        <>
          <Input
            label="Provider Name"
            name="providerName"
            required
            placeholder="e.g. Banadir Power"
          />
          <input
            type="hidden"
            name="serviceType"
            value={ELECTRICITY_TYPES[0]!.value}
          />
          <Input
            label={`Price Per kWh (USD) · ${year}`}
            name="pricePerKwh"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
          />
        </>
      )}

      <AdminSaveButton
        type="submit"
        label={`Save ${sectorConfig[activeSector].label} Record`}
        saving={loading}
        fullWidth
      />
    </form>
  );

  return (
    <div className="space-y-5">
      {!locked && (
        <div className="flex gap-2 rounded-2xl border border-emerald-100 bg-white p-2 shadow-[var(--shadow)]">
          {availableSectors.map((s) => {
            const cfg = sectorConfig[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSector(s);
                  setCurrentPrice("");
                  setMessage("");
                  setError("");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all sm:px-4",
                  activeSector === s
                    ? cfg.color + " border-2 shadow-sm"
                    : "border-2 border-transparent text-gray-500 hover:bg-gray-50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {embedded ? (
        formBody
      ) : (
        <Card className="glow-card">
          <div className="mb-6 flex items-center gap-2">
            <Plus className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="text-lg font-bold text-gray-900">
              Add {sectorConfig[activeSector].label} Price
            </h3>
          </div>
          {formBody}
        </Card>
      )}
    </div>
  );
}
