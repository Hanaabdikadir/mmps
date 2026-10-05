"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface YearlyRateTrendRow {
  year: number;
  rate: number;
}

function roundToNiceStep(step: number): number {
  if (step <= 0) return 0.01;
  const pow = Math.pow(10, Math.floor(Math.log10(step)));
  const normalized = step / pow;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 2.5) nice = 2.5;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

export function buildRateAxisTicks(values: number[], tickCount = 5): number[] {
  const electricityStandardTicks = [0.35, 0.36, 0.38, 0.4, 0.41];
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return electricityStandardTicks;

  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  if (min >= 0.34 && max <= 0.42) return electricityStandardTicks;

  // Keep enough span so 2-decimal tick labels never collapse to duplicates
  // (Recharts keys ticks by value; duplicates warn and break identity).
  const minSpanForUniqueTicks = 0.01 * (tickCount - 1);
  const dataSpan = Math.max(max - min, 0);
  const span = Math.max(dataSpan, minSpanForUniqueTicks);
  const mid = (min + max) / 2;
  const padded = span * 1.16;
  const start = mid - padded / 2;
  const end = mid + padded / 2;
  const roughStep = (end - start) / (tickCount - 1);
  const step = Math.max(roundToNiceStep(roughStep), 0.01);
  const niceStart = Math.floor(start / step) * step;

  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    let candidate = Number((niceStart + step * i).toFixed(2));
    while (ticks.includes(candidate)) {
      candidate = Number((candidate + step).toFixed(2));
    }
    ticks.push(candidate);
  }
  return ticks;
}

function CustomTooltip({
  active,
  payload,
  label,
  formatTooltipValue,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
  formatTooltipValue: (value: number) => string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#a7f3d0] rounded-lg px-2.5 py-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.12)] text-[11px]">
        <p className="font-bold text-black mb-0.5">{label}</p>
        <p className="font-semibold text-blue-700">
          Rate: {formatTooltipValue(Number(payload[0].value))}
        </p>
      </div>
    );
  }
  return null;
}

export function YearlyRateTrendChart({
  rows,
  gradientId,
  height = 96,
  fillHeight = false,
  fixedWidth,
  animate = false,
  formatTooltipValue,
  animationKey,
}: {
  rows: YearlyRateTrendRow[];
  gradientId: string;
  height?: number;
  fillHeight?: boolean;
  fixedWidth?: number;
  animate?: boolean;
  formatTooltipValue: (value: number) => string;
  animationKey?: string | number;
}) {
  const chartData = rows.map((row) => ({
    year: String(row.year),
    value: row.rate,
  }));
  const yTicks = buildRateAxisTicks(rows.map((row) => row.rate));
  const yMin = yTicks[0]!;
  const yMax = yTicks[yTicks.length - 1]!;
  const lineColor = "#2563eb";
  const isCompact = fillHeight || Boolean(fixedWidth);
  const margin = {
    top: 6,
    right: fixedWidth ? 24 : isCompact ? 18 : 14,
    left: 0,
    bottom: 0,
  };
  const xPadding = { left: 6, right: fixedWidth ? 20 : 16 };

  const chart = (
    <AreaChart
      data={chartData}
      width={fixedWidth}
      height={fixedWidth ? height : undefined}
      margin={margin}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="4 4" stroke="#bbf7d0" vertical={false} />
      <XAxis
        dataKey="year"
        tick={{ fontSize: 8, fill: "#1e40af" }}
        axisLine={false}
        tickLine={false}
        dy={4}
        height={22}
        interval={0}
        minTickGap={0}
        padding={xPadding}
      />
      <YAxis
        hide
        width={0}
        ticks={yTicks}
        interval={0}
        allowDecimals
        allowDuplicatedCategory={false}
        domain={[yMin, yMax]}
      />
      {!fixedWidth ? (
        <Tooltip
          cursor={false}
          content={
            <CustomTooltip formatTooltipValue={formatTooltipValue} />
          }
        />
      ) : null}
      <Area
        key={animationKey}
        type="monotone"
        dataKey="value"
        stroke={lineColor}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`url(#${gradientId})`}
        baseValue={yMin}
        connectNulls
        dot={{ r: 2, fill: lineColor, stroke: "#fff", strokeWidth: 1 }}
        activeDot={
          fixedWidth ? false : { r: 3, fill: lineColor, stroke: "#fff", strokeWidth: 1 }
        }
        isAnimationActive={animate}
        animationDuration={850}
        animationEasing="ease-out"
      />
    </AreaChart>
  );

  if (fixedWidth) {
    return <div className="rates-trend-chart flex w-full justify-center">{chart}</div>;
  }

  return (
    <div
      className={cn("rates-trend-chart h-full w-full")}
    >
      <ResponsiveContainer width="100%" height={fillHeight ? "100%" : height} minHeight={96}>
        {chart}
      </ResponsiveContainer>
    </div>
  );
}
