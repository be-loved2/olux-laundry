'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCurrency } from '@/lib/utils';

import type { OrdersByService } from '@/server/actions/reports';

interface ServiceChartProps {
  data: OrdersByService[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-oxblue-900">{label}</p>
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

export function ServiceBarChart({ data }: ServiceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No service data for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis
          dataKey="serviceName"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
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
        <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(217 64% 30%)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="orders" dataKey="count" fill="hsl(210 100% 75%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
