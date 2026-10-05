"use client";

import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildRateAxisTicks } from "@/components/YearlyRateTrendChart";
import { useLang } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type CompanyAdminRatePoint = {
  year: number;
  rate: number;
  low?: number;
  mid?: number;
  high?: number;
};

const YEAR_COLORS: Record<number, string> = {
  2022: "#2563eb",
  2023: "#7c3aed",
  2024: "#0d9488",
  2025: "#f59e0b",
  2026: "#e11d48",
};

const YEAR_FALLBACK = ["#2563eb", "#7c3aed", "#0d9488", "#f59e0b", "#e11d48"];

const TIER_META = [
  { key: "low" as const, label: "1–1,000 kWh", opacity: 0.55 },
  { key: "mid" as const, label: "1,001–5,000 kWh", opacity: 0.78 },
  { key: "high" as const, label: "5,001+ kWh", opacity: 1 },
];

function colorForYear(year: number) {
  return YEAR_COLORS[year] ?? YEAR_FALLBACK[Math.abs(year) % YEAR_FALLBACK.length]!;
}

function formatRate(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(n >= 10 ? 1 : 2);
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function TrendTooltip({
  active,
  payload,
  unit,
  showTiers,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, number> }>;
  unit: string;
  showTiers: boolean;
}) {
  const { t } = useLang();
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;
  if (showTiers) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          {row.year}
        </p>
        <ul className="mt-1 space-y-1">
          {TIER_META.map((t) => (
            <li
              key={t.key}
              className="flex items-center justify-between gap-4 text-[12px] font-bold"
            >
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colorForYear(row.year) }}
                />
                {t.label}
              </span>
              <span className="tabular-nums text-slate-900">
                {formatRate(num(row[t.key]))}{" "}
                <span className="text-[10px] font-semibold text-slate-400">
                  {unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const rate = Number(row.rate);
  const delta = Number(row.delta ?? 0);
  const deltaPct = Number(row.deltaPct ?? 0);
  const rising = delta > 0;
  const falling = delta < 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {row.year}
      </p>
      <p className="mt-0.5 text-[15px] font-black tabular-nums text-slate-900">
        {formatRate(rate)}{" "}
        <span className="text-[11px] font-bold text-slate-500">{unit}</span>
      </p>
      {Number.isFinite(delta) && (rising || falling) ? (
        <p
          className={cn(
            "mt-1 text-[11px] font-bold",
            rising ? "text-emerald-600" : "text-rose-600"
          )}
        >
          {rising ? t("▲ Up", "▲ Kor") : t("▼ Down", "▼ Hoos")} {rising ? "+" : ""}
          {formatRate(delta)} ({rising ? "+" : ""}
          {deltaPct.toFixed(1)}%) {t("vs prior year", "marka la barbar dhigo sannadkii hore")}
        </p>
      ) : (
        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          {t("Steady vs prior year", "Isku mid ayuu yahay sannadkii hore")}
        </p>
      )}
    </div>
  );
}

export function CompanyAdminRateTrendChart({
  rows,
  rateUnit,
  height = 260,
  className,
}: {
  rows: CompanyAdminRatePoint[];
  rateUnit: string;
  height?: number;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const showTiers = rows.some(
    (r) => num(r.low) > 0 && num(r.mid) > 0 && num(r.high) > 0
  );

  const chartData = rows.map((row, index) => {
    const prev = index > 0 ? rows[index - 1]!.rate : row.rate;
    const delta = row.rate - prev;
    const deltaPct = prev > 0 ? (delta / prev) * 100 : 0;
    return {
      year: row.year,
      rate: row.rate,
      low: num(row.low),
      mid: num(row.mid),
      high: num(row.high),
      delta: index === 0 ? 0 : delta,
      deltaPct: index === 0 ? 0 : deltaPct,
    };
  });

  const values = showTiers
    ? chartData.flatMap((r) => [r.low, r.mid, r.high].filter((n) => n > 0))
    : chartData.map((r) => r.rate);
  const yTicks = buildRateAxisTicks(values);
  const yMin = yTicks[0]!;
  const yMax = yTicks[yTicks.length - 1]!;
  const gradientId = `admin-rate-area-${rateUnit.replace(/\W+/g, "")}`;

  return (
    <div className={cn("w-full min-w-0", className)} style={{ height, minHeight: height }}>
      {ready ? (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 14, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.32} />
              <stop offset="55%" stopColor="#8b5cf6" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={(props) => {
              const { x, y, payload } = props;
              const year = Number(payload?.value);
              return (
                <text
                  x={x}
                  y={y}
                  dy={14}
                  textAnchor="middle"
                  fill={colorForYear(year)}
                  fontSize={12}
                  fontWeight={700}
                >
                  {payload?.value}
                </text>
              );
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            hide
            width={0}
            domain={[yMin, yMax]}
            ticks={yTicks}
            interval={0}
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<TrendTooltip unit={rateUnit} showTiers={showTiers} />}
          />
          {showTiers ? (
            TIER_META.map((t) => (
              <Bar
                key={`bar-${t.key}`}
                dataKey={t.key}
                name={t.label}
                radius={[8, 8, 4, 4]}
                maxBarSize={22}
                isAnimationActive
                animationDuration={900}
              >
                {chartData.map((row) => (
                  <Cell
                    key={`${t.key}-${row.year}`}
                    fill={colorForYear(row.year)}
                    fillOpacity={t.opacity}
                  />
                ))}
              </Bar>
            ))
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="rate"
                fill={`url(#${gradientId})`}
                stroke="none"
                isAnimationActive
                animationDuration={1200}
                legendType="none"
                tooltipType="none"
              />
              <Bar
                dataKey="rate"
                radius={[10, 10, 4, 4]}
                maxBarSize={40}
                isAnimationActive
                animationDuration={900}
                legendType="none"
                tooltipType="none"
              >
                {chartData.map((row) => (
                  <Cell
                    key={`bar-${row.year}`}
                    fill={colorForYear(row.year)}
                    fillOpacity={0.88}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="rate"
                name="Rate"
                stroke="#94a3b8"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={(props) => {
                  const { cx, cy, index } = props;
                  if (cx == null || cy == null || index == null) return null;
                  const year = chartData[index]?.year;
                  const fill = year != null ? colorForYear(year) : "#4f46e5";
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={fill}
                      stroke="#fff"
                      strokeWidth={2.5}
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: "#4f46e5",
                }}
                isAnimationActive
                animationBegin={200}
                animationDuration={1400}
              />
            </>
          )}
          {showTiers
            ? TIER_META.map((t) => (
                <Line
                  key={`line-${t.key}`}
                  type="monotone"
                  dataKey={t.key}
                  name={t.label}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeOpacity={0.55}
                  dot={(props) => {
                    const { cx, cy, index } = props;
                    if (cx == null || cy == null || index == null) return null;
                    const year = chartData[index]?.year;
                    const fill = year != null ? colorForYear(year) : "#4f46e5";
                    return (
                      <circle
                        key={`dot-${t.key}-${index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={fill}
                        fillOpacity={t.opacity}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }}
                  legendType="none"
                  isAnimationActive
                  animationDuration={1200}
                />
              ))
            : null}
        </ComposedChart>
      </ResponsiveContainer>
      ) : null}
    </div>
  );
}
