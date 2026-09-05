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

/** Revenue over time.
 *
 *  One series, not two. Revenue and order count share an axis badly — orders
 *  are single digits while revenue is thousands — and a dual axis invites the
 *  reader to see a relationship that the scaling invented.
 */
export function SalesChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const empty = data.every((point) => point.revenue === 0);

  if (empty) {
    return (
      <div className="admin-empty" style={{ border: "none" }}>
        No paid orders in this period.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#512BC7" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#512BC7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6e2f2" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b6482" }}
            tickLine={false}
            axisLine={{ stroke: "#e6e2f2" }}
            // Enough labels to orient, not so many they overlap.
            interval="preserveStartEnd"
            minTickGap={28}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b6482" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => `${Math.round(value)}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e6e2f2",
              fontSize: 13,
            }}
            formatter={(value) => [`AED ${Number(value ?? 0).toFixed(2)}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#512BC7"
            strokeWidth={2}
            fill="url(#revenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
