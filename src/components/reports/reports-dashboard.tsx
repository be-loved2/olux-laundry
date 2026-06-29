'use client';

import { Download, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { RevenueChart } from '@/components/reports/revenue-chart';
import { ServiceBarChart } from '@/components/reports/service-bar-chart';
import { StatusDonutChart } from '@/components/reports/status-donut-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  exportReportsCSVAction,
  fetchReportsDataAction,
  type ReportsData,
  type ReportsFilter,
} from '@/server/actions/reports';
import { formatCurrency } from '@/lib/utils';

// ── Preset ranges ─────────────────────────────────────────────────────────────

type Preset = '7d' | '30d' | '90d' | '365d' | 'custom';

function getPresetDates(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[preset];
  from.setDate(from.getDate() - days + 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const PRESET_LABELS: Record<Preset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '365d': 'Last 12 months',
  custom: 'Custom',
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-oxblue-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Chart legend pill ─────────────────────────────────────────────────────────

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  canExport: boolean;
  initialData: ReportsData;
  initialFilter: ReportsFilter;
}

export function ReportsDashboard({ canExport, initialData, initialFilter }: Props) {
  const [preset, setPreset] = useState<Preset>('30d');
  const [filter, setFilter] = useState<ReportsFilter>(initialFilter);
  const [customFrom, setCustomFrom] = useState(initialFilter.from);
  const [customTo, setCustomTo] = useState(initialFilter.to);
  const [data, setData] = useState<ReportsData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRender = useRef(true);

  const reload = useCallback((f: ReportsFilter) => {
    setError(null);
    startTransition(async () => {
      const result = await fetchReportsDataAction(f);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    });
  }, []);

  // Skip the initial load — we already have server-rendered data
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    reload(filter);
  }, [filter, reload]);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== 'custom') {
      const dates = getPresetDates(p);
      setCustomFrom(dates.from);
      setCustomTo(dates.to);
      setFilter(dates);
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo || customFrom > customTo) return;
    setPreset('custom');
    setFilter({ from: customFrom, to: customTo });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportReportsCSVAction(filter);
      if (!result.success) {
        alert(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  const { summary, revenueByDay, ordersByStatus, ordersByService, topCustomers, riderPerformance } =
    data;

  const deliveryRate =
    summary.totalOrders > 0 ? Math.round((summary.deliveredOrders / summary.totalOrders) * 100) : 0;
  const cancellationRate =
    summary.totalOrders > 0 ? Math.round((summary.cancelledOrders / summary.totalOrders) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header + controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">Reports & Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filter.from} → {filter.to}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset buttons */}
          {(['7d', '30d', '90d', '365d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                preset === p
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-muted-foreground hover:bg-secondary'
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          {/* Custom date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-lg border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-lg border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" variant="outline" onClick={applyCustom} className="h-8 px-3">
              Apply
            </Button>
          </div>
          {/* Refresh */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => reload(filter)}
            disabled={isPending}
            className="h-8 w-8 p-0"
            aria-label="Refresh"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          {/* Export */}
          {canExport && (
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI stat cards */}
      <div
        className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-4 ${isPending ? 'opacity-50' : ''}`}
      >
        <StatCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
        <StatCard label="Total Orders" value={summary.totalOrders.toLocaleString()} />
        <StatCard label="Avg Order Value" value={formatCurrency(summary.avgOrderValue)} />
        <StatCard
          label="Avg Rating"
          value={summary.avgRating !== null ? `${summary.avgRating} / 5` : '—'}
        />
        <StatCard
          label="Delivered"
          value={`${summary.deliveredOrders.toLocaleString()}`}
          sub={`${deliveryRate}% delivery rate`}
        />
        <StatCard
          label="Cancelled"
          value={`${summary.cancelledOrders.toLocaleString()}`}
          sub={`${cancellationRate}% cancellation rate`}
        />
        <StatCard label="Active / In-Progress" value={summary.pendingOrders.toLocaleString()} />
        <StatCard
          label="New Customers"
          value={summary.newCustomers.toLocaleString()}
          sub={`${summary.totalCustomers.toLocaleString()} total · ${summary.repeatCustomers.toLocaleString()} repeat`}
        />
      </div>

      {/* Revenue over time */}
      <Card className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Revenue & Orders Over Time</CardTitle>
          <div className="flex items-center gap-4">
            <LegendPill color="hsl(217 64% 30%)" label="Revenue" />
            <LegendPill color="hsl(210 100% 65%)" label="Orders" />
          </div>
        </CardHeader>
        <CardContent>
          {revenueByDay.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No revenue data for this period.
            </p>
          ) : (
            <RevenueChart data={revenueByDay} />
          )}
        </CardContent>
      </Card>

      {/* Status donut + Service bar */}
      <div
        className={`grid gap-6 transition-opacity duration-200 lg:grid-cols-2 ${isPending ? 'opacity-50' : ''}`}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonutChart data={ordersByStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Service</CardTitle>
            <div className="flex items-center gap-3">
              <LegendPill color="hsl(217 64% 30%)" label="Revenue" />
              <LegendPill color="hsl(210 100% 75%)" label="Orders" />
            </div>
          </CardHeader>
          <CardContent>
            <ServiceBarChart data={ordersByService} />
          </CardContent>
        </Card>
      </div>

      {/* Service breakdown table */}
      <Card className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Service Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {ordersByService.length === 0 && (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                No data for this period.
              </p>
            )}
            {ordersByService.map((row) => (
              <div
                key={row.serviceName}
                className="flex items-center justify-between px-6 py-3.5 text-sm"
              >
                <span className="font-medium text-oxblue-900">{row.serviceName}</span>
                <div className="flex items-center gap-6 text-muted-foreground">
                  <Badge variant="muted">{row.count} orders</Badge>
                  <span className="w-28 text-right font-semibold text-foreground">
                    {formatCurrency(row.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top customers + Rider performance */}
      <div
        className={`grid gap-6 transition-opacity duration-200 lg:grid-cols-2 ${isPending ? 'opacity-50' : ''}`}
      >
        {/* Top customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topCustomers.length === 0 && (
                <p className="px-6 py-6 text-center text-sm text-muted-foreground">No data.</p>
              )}
              {topCustomers.map((c, i) => (
                <div key={c.customerId} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-oxblue-900">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(c.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">{c.totalOrders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rider performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Rider Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {riderPerformance.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                No delivery data for this period.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {riderPerformance.map((r, i) => {
                  const max = riderPerformance[0].deliveries;
                  return (
                    <div key={r.riderName} className="flex items-center gap-3 px-6 py-3 text-sm">
                      <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium text-oxblue-900">
                            {r.riderName}
                          </span>
                          <span className="ml-2 shrink-0 text-xs font-semibold text-foreground">
                            {r.deliveries} deliveries
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(r.deliveries / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
