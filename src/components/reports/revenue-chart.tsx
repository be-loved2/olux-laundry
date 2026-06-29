'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCurrency } from '@/lib/utils';

import type { RevenueByDay } from '@/server/actions/reports';

interface RevenueChartProps {
  data: RevenueByDay[];
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-oxblue-900">{formatDateLabel(label)}</p>
      <p className="text-muted-foreground">
        Revenue:{' '}
        <span className="font-medium text-foreground">
          {formatCurrency(payload[0]?.value ?? 0)}
        </span>
      </p>
      <p className="text-muted-foreground">
        Orders: <span className="font-medium text-foreground">{payload[1]?.value ?? 0}</span>
      </p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Thin out x-axis labels when there are many days
  const tickInterval = data.length > 60 ? 13 : data.length > 30 ? 6 : data.length > 14 ? 2 : 0;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
          tickFormatter={formatDateLabel}
          interval={tickInterval}
        />
        <YAxis
          yAxisId="revenue"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
          tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <YAxis
          yAxisId="orders"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(217 64% 30%)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'hsl(217 64% 30%)' }}
        />
        <Line
          yAxisId="orders"
          type="monotone"
          dataKey="orders"
          stroke="hsl(210 100% 65%)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'hsl(210 100% 65%)' }}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
