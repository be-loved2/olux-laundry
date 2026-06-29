'use server';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export interface ReportsFilter {
  from: string; // ISO date string
  to: string; // ISO date string
}

export interface ReportsSummary {
  totalRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  avgOrderValue: number;
  avgRating: number | null;
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
}

export interface RevenueByDay {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface OrdersByService {
  serviceName: string;
  count: number;
  revenue: number;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

export interface RiderPerformance {
  riderName: string;
  deliveries: number;
}

export interface ReportsData {
  summary: ReportsSummary;
  revenueByDay: RevenueByDay[];
  ordersByStatus: OrdersByStatus[];
  ordersByService: OrdersByService[];
  topCustomers: TopCustomer[];
  riderPerformance: RiderPerformance[];
}

type FetchReportsResult = { success: true; data: ReportsData } | { success: false; error: string };

export async function fetchReportsDataAction(filter: ReportsFilter): Promise<FetchReportsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'reports.view')) {
    return { success: false, error: 'Unauthorized.' };
  }

  const from = new Date(filter.from);
  const to = new Date(filter.to);
  // Include the full "to" day
  to.setHours(23, 59, 59, 999);

  const dateFilter = { createdAt: { gte: from, lte: to } };
  const paymentDateFilter = { paidAt: { gte: from, lte: to }, status: 'SUCCESS' as const };

  const [
    payments,
    orders,
    reviewsAgg,
    allCustomers,
    newCustomerUsers,
    ordersByStatusRaw,
    ordersByServiceRaw,
    services,
    topCustomersRaw,
    riderOrdersRaw,
  ] = await Promise.all([
    // All successful payments in range
    prisma.payment.findMany({
      where: paymentDateFilter,
      select: { amount: true, paidAt: true },
    }),
    // All orders in range
    prisma.order.findMany({
      where: dateFilter,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        serviceId: true,
        riderId: true,
      },
    }),
    // Average rating
    prisma.review.aggregate({
      where: { createdAt: { gte: from, lte: to }, isApproved: true },
      _avg: { rating: true },
    }),
    // Total customers (all time)
    prisma.customer.count(),
    // New customers in period
    prisma.user.count({
      where: { role: 'CUSTOMER', createdAt: { gte: from, lte: to } },
    }),
    // Orders grouped by status
    prisma.order.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { id: true },
    }),
    // Orders grouped by service
    prisma.order.groupBy({
      by: ['serviceId'],
      where: dateFilter,
      _count: { id: true },
      _sum: { total: true },
    }),
    // Service names
    prisma.service.findMany({ select: { id: true, name: true } }),
    // Top customers by spend
    prisma.customer.findMany({
      where: { orders: { some: dateFilter } },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
        orders: {
          where: dateFilter,
          select: { total: true },
        },
      },
      take: 50, // fetch more, sort in-memory
    }),
    // Rider deliveries
    prisma.order.findMany({
      where: { ...dateFilter, status: 'DELIVERED', riderId: { not: null } },
      select: { riderId: true },
    }),
  ]);

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
  const pendingOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Repeat customers: customers who placed >1 order all time
  const repeatCustomers = await prisma.customer.count({
    where: { totalOrders: { gt: 1 } },
  });

  const summary: ReportsSummary = {
    totalRevenue,
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    pendingOrders,
    avgOrderValue,
    avgRating: reviewsAgg._avg.rating ? Math.round(reviewsAgg._avg.rating * 10) / 10 : null,
    totalCustomers: allCustomers,
    newCustomers: newCustomerUsers,
    repeatCustomers,
  };

  // ── Revenue by day ────────────────────────────────────────────────────────
  const revenueMap = new Map<string, { revenue: number; orders: number }>();
  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = p.paidAt.toISOString().slice(0, 10);
    const existing = revenueMap.get(key) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(p.amount);
    revenueMap.set(key, existing);
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const existing = revenueMap.get(key) ?? { revenue: 0, orders: 0 };
    existing.orders += 1;
    revenueMap.set(key, existing);
  }

  // Build a contiguous date series
  const revenueByDay: RevenueByDay[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = revenueMap.get(key) ?? { revenue: 0, orders: 0 };
    revenueByDay.push({ date: key, ...entry });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Orders by status ──────────────────────────────────────────────────────
  const ordersByStatus: OrdersByStatus[] = ordersByStatusRaw
    .map((r) => ({ status: r.status, count: r._count.id }))
    .sort((a, b) => b.count - a.count);

  // ── Orders by service ─────────────────────────────────────────────────────
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  const ordersByService: OrdersByService[] = ordersByServiceRaw
    .map((r) => ({
      serviceName: serviceMap.get(r.serviceId) ?? r.serviceId,
      count: r._count.id,
      revenue: Number(r._sum?.total ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Top customers ─────────────────────────────────────────────────────────
  const topCustomers: TopCustomer[] = topCustomersRaw
    .map((c) => ({
      customerId: c.id,
      name: c.user.name,
      email: c.user.email,
      totalOrders: c.orders.length,
      totalSpent: c.orders.reduce((s, o) => s + Number(o.total), 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // ── Rider performance ─────────────────────────────────────────────────────
  const riderCountMap = new Map<string, number>();
  for (const o of riderOrdersRaw) {
    if (o.riderId) riderCountMap.set(o.riderId, (riderCountMap.get(o.riderId) ?? 0) + 1);
  }

  let riderPerformance: RiderPerformance[] = [];
  if (riderCountMap.size > 0) {
    const riders = await prisma.deliveryRider.findMany({
      where: { id: { in: Array.from(riderCountMap.keys()) } },
      select: { id: true, user: { select: { name: true } } },
    });
    riderPerformance = riders
      .map((r) => ({
        riderName: r.user.name,
        deliveries: riderCountMap.get(r.id) ?? 0,
      }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 8);
  }

  return {
    success: true,
    data: {
      summary,
      revenueByDay,
      ordersByStatus,
      ordersByService,
      topCustomers,
      riderPerformance,
    },
  };
}

// ── CSV Export ───────────────────────────────────────────────────────────────

export async function exportReportsCSVAction(
  filter: ReportsFilter,
): Promise<{ success: true; csv: string; filename: string } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'reports.export')) {
    return { success: false, error: 'Unauthorized.' };
  }

  const from = new Date(filter.from);
  const to = new Date(filter.to);
  to.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      deliveryFee: true,
      service: { select: { name: true } },
      customer: { select: { user: { select: { name: true, email: true } } } },
      payments: {
        where: { status: 'SUCCESS' },
        select: { amount: true, method: true, paidAt: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const header = [
    'Order Number',
    'Date',
    'Status',
    'Service',
    'Customer Name',
    'Customer Email',
    'Total (NGN)',
    'Delivery Fee (NGN)',
    'Payment Method',
    'Paid At',
  ].join(',');

  const rows = orders.map((o) => {
    const payment = o.payments[0];
    return [
      o.orderNumber,
      o.createdAt.toISOString().slice(0, 10),
      o.status,
      o.service.name,
      `"${o.customer.user.name}"`,
      o.customer.user.email,
      Number(o.total).toFixed(2),
      Number(o.deliveryFee).toFixed(2),
      payment?.method ?? '',
      payment?.paidAt?.toISOString().slice(0, 10) ?? '',
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const filename = `olux-reports-${filter.from}-to-${filter.to}.csv`;

  return { success: true, csv, filename };
}
