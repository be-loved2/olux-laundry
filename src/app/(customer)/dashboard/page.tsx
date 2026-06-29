import { ArrowRight, Package, ShoppingBag, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderStatusLabel, orderStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);

  const customer = await prisma.customer.findUnique({
    where: { userId: session!.user.id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
        include: { service: true },
        take: 5,
      },
    },
  });

  const stats = [
    { label: 'Active orders', value: customer?.orders.length ?? 0, icon: Package },
    { label: 'Total orders', value: customer?.totalOrders ?? 0, icon: ShoppingBag },
    {
      label: 'Total spent',
      value: formatCurrency(Number(customer?.totalSpent ?? 0)),
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">
            Welcome back, {session?.user.name?.split(' ')[0] ?? 'there'}.
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your laundry.
          </p>
        </div>
        <Button asChild>
          <Link href="/book-pickup">Book a pickup</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-oxblue-50 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-oxblue-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Active orders</CardTitle>
          <Link
            href="/dashboard/orders"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {!customer?.orders.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active orders right now.{' '}
              <Link href="/book-pickup" className="font-medium text-primary hover:underline">
                Book one?
              </Link>
            </p>
          ) : (
            <div className="divide-y divide-border">
              {customer.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-secondary/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-oxblue-900">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.service.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={orderStatusVariant(order.status)}>
                      {orderStatusLabel(order.status)}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
