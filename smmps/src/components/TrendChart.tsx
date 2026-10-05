"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";

interface TrendChartProps {
  data: { dateRecorded: Date | string; value: number }[];
  color?: string;
  label?: string;
}

export function TrendChart({
  data,
  color = "#2563eb",
  label = "Price",
}: TrendChartProps) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.dateRecorded), "MMM d"),
    value: Number(d.value),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-400">
        <div className="mb-2 h-8 w-8 rounded-full border-2 border-dashed border-gray-300" />
        No trend data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: -8 }}
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          dy={4}
          height={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickMargin={4}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            fontSize: "13px",
          }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#grad-${color})`}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
