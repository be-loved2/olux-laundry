'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { OrdersByStatus } from '@/server/actions/reports';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PICKUP_ASSIGNED: '#8b5cf6',
  PICKED_UP: '#6366f1',
  RECEIVED: '#0ea5e9',
  WASHING: '#06b6d4',
  DRY_CLEANING: '#14b8a6',
  IRONING: '#10b981',
  PACKAGING: '#22c55e',
  QUALITY_CHECK: '#84cc16',
  OUT_FOR_DELIVERY: '#f97316',
  DELIVERED: '#16a34a',
  CANCELLED: '#ef4444',
};

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusChartProps {
  data: OrdersByStatus[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-2 text-sm shadow-lg">
      <p className="font-semibold text-oxblue-900">{formatStatus(name)}</p>
      <p className="text-muted-foreground">
        {value} order{value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function StatusDonutChart({ data }: StatusChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No order data for this period.
      </div>
    );
  }

  const chartData = data.map((d) => ({ name: d.status, value: d.count }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] ?? `hsl(${(i * 47) % 360} 65% 55%)`}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-foreground">{formatStatus(value)}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
