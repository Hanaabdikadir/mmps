"use client";

import { useEffect, useState } from "react";

type Slot = {
  id: number;
  name: string;
};

type Slots = {
  maxMarkets: number | null;
  maxLivestockTypes: number | null;
  markets: Slot[];
  types: Slot[];
  availableMarkets: Slot[];
  availableTypes: Slot[];
};

export function BrokerPlanSlots({ lang }: { lang: "en" | "so" }) {
  const tx = (en: string, so: string) => (lang === "so" ? so : en);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [marketId, setMarketId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/broker/subscription")
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? null))
      .catch(() => setSlots(null));
  }, []);

  if (!slots) return null;

  const marketRoom =
    slots.maxMarkets == null || slots.markets.length < slots.maxMarkets;
  const typeRoom =
    slots.maxLivestockTypes == null || slots.types.length < slots.maxLivestockTypes;
  const openMarkets = slots.availableMarkets.filter(
    (m) => !slots.markets.some((picked) => picked.id === m.id)
  );
  const openTypes = slots.availableTypes.filter(
    (t) => !slots.types.some((picked) => picked.id === t.id)
  );

  async function add(body: { marketId?: number; categoryId?: number }) {
    setError("");
    const res = await fetch("/api/broker/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || tx("Could not save", "Lama kaydin"));
      return;
    }
    setSlots(data.slots ?? null);
    setMarketId("");
    setTypeId("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-black text-slate-900">
        {tx("Markets and types", "Suuqyada iyo noocyada")}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {tx(
          "You keep every market and type in the plan you chose. The months you paid only set how long it stays open.",
          "Waxaad haysataa suuq kasta iyo nooc kasta oo qorshaha aad dooratay ku jira. Bilaha aad bixisay waxay sheegaan inta uu furnaanayo."
        )}
      </p>
      <p className="mt-3 text-sm font-semibold text-slate-800">
        {tx("Markets", "Suuqyada")}: {slots.markets.map((m) => m.name).join(", ") || "—"}
        {slots.maxMarkets != null
          ? ` (${slots.markets.length} ${tx("of", "ee")} ${slots.maxMarkets})`
          : ""}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {tx("Types", "Noocyada")}: {slots.types.map((t) => t.name).join(", ") || "—"}
        {slots.maxLivestockTypes != null
          ? ` (${slots.types.length} ${tx("of", "ee")} ${slots.maxLivestockTypes})`
          : ""}
      </p>
      {marketRoom && openMarkets.length > 0 ? (
        <div className="mt-4 flex gap-2">
          <select
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
          >
            <option value="">{tx("Add a market", "Ku dar suuq")}</option>
            {openMarkets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white"
            disabled={!marketId}
            onClick={() => add({ marketId: Number(marketId) })}
          >
            {tx("Add", "Ku dar")}
          </button>
        </div>
      ) : null}
      {typeRoom && openTypes.length > 0 ? (
        <div className="mt-2 flex gap-2">
          <select
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            <option value="">{tx("Add a type", "Ku dar nooc")}</option>
            {openTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white"
            disabled={!typeId}
            onClick={() => add({ categoryId: Number(typeId) })}
          >
            {tx("Add", "Ku dar")}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
