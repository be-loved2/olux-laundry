import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { orderStatusLabel, orderStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Orders — Admin' };

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Out for delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'orders.view')) redirect('/admin');

  const statusFilter = searchParams.status ?? '';

  const whereStatus =
    statusFilter === 'active'
      ? { notIn: ['DELIVERED', 'CANCELLED'] as any[] }
      : statusFilter
        ? { equals: statusFilter as any }
        : undefined;

  const orders = await prisma.order.findMany({
    where: whereStatus ? { status: whereStatus } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      service: true,
      customer: { include: { user: true } },
      rider: { include: { user: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Orders</h1>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/orders?status=${f.value}` : '/admin/orders'}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-white'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {orders.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No orders match this filter.
            </p>
          )}
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.orderNumber}`}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-secondary/40"
            >
              <div>
                <p className="text-sm font-semibold text-oxblue-900">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {order.customer.user.name} · {order.service.name} ·{' '}
                  {order.createdAt.toDateString()}
                </p>
                {order.rider && (
                  <p className="text-xs text-muted-foreground">
                    Rider: {order.rider.user.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{formatCurrency(Number(order.total))}</span>
                <Badge variant={orderStatusVariant(order.status)}>
                  {orderStatusLabel(order.status)}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
