import { ArrowRight, Package, Star, TrendingUp, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { orderStatusLabel, orderStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Admin Overview' };

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;

  const canViewReports = hasPermission(role, 'reports.view');
  const canViewCustomers = hasPermission(role, 'customers.view');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    activeOrders,
    pendingOrders,
    monthlyOrders,
    totalCustomers,
    revenueResult,
    monthlyRevenueResult,
    avgRatingResult,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    canViewCustomers ? prisma.customer.count() : Promise.resolve(null),
    canViewReports
      ? prisma.payment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
        })
      : Promise.resolve(null),
    canViewReports
      ? prisma.payment.aggregate({
          where: { status: 'SUCCESS', paidAt: { gte: startOfMonth } },
          _sum: { amount: true },
        })
      : Promise.resolve(null),
    prisma.review.aggregate({ where: { isApproved: true }, _avg: { rating: true } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { service: true, customer: { include: { user: true } } },
    }),
  ]);

  const stats = [
    {
      label: 'Active orders',
      value: activeOrders,
      sub: `${pendingOrders} pending`,
      icon: Package,
      href: '/admin/orders?status=active',
      color: 'text-oxblue-700 bg-oxblue-50',
    },
    {
      label: 'Orders this month',
      value: monthlyOrders,
      sub: `${totalOrders} all time`,
      icon: TrendingUp,
      href: '/admin/orders',
      color: 'text-emerald-700 bg-emerald-50',
    },
    ...(canViewCustomers
      ? [
          {
            label: 'Total customers',
            value: totalCustomers ?? 0,
            sub: 'registered accounts',
            icon: Users,
            href: '/admin/customers',
            color: 'text-violet-700 bg-violet-50',
          },
        ]
      : []),
    ...(canViewReports
      ? [
          {
            label: 'Revenue this month',
            value: formatCurrency(Number(monthlyRevenueResult?._sum?.amount ?? 0)),
            sub: `${formatCurrency(Number(revenueResult?._sum?.amount ?? 0))} all time`,
            icon: Wallet,
            href: '/admin/reports',
            color: 'text-amber-700 bg-amber-50',
          },
        ]
      : []),
    {
      label: 'Avg review rating',
      value:
        avgRatingResult._avg.rating != null
          ? `${avgRatingResult._avg.rating.toFixed(1)} / 5`
          : '—',
      sub: 'approved reviews',
      icon: Star,
      href: '/admin/reviews',
      color: 'text-rose-700 bg-rose-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">
            Good {getGreeting()}, {session?.user.name?.split(' ')[0] ?? 'there'}.
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what the business looks like right now.</p>
        </div>
        {hasPermission(role, 'orders.edit') && (
          <Button asChild>
            <Link href="/admin/orders">Manage orders</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group block">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-oxblue-900">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent orders</CardTitle>
          <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="text-sm font-semibold text-oxblue-900">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer.user.name} · {order.service.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(Number(order.total))}
                  </span>
                  <Badge variant={orderStatusVariant(order.status)}>
                    {orderStatusLabel(order.status)}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
