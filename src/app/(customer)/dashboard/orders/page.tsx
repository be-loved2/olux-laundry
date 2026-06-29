import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderStatusLabel, orderStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'My Orders' };

export default async function CustomerOrdersPage() {
  const session = await getServerSession(authOptions);

  const customer = await prisma.customer.findUnique({
    where: { userId: session!.user.id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { service: true },
      },
    },
  });

  const orders = customer?.orders ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">My Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You haven&apos;t placed any orders yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="text-sm font-semibold text-oxblue-900">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.service.name} · {order.createdAt.toDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(Number(order.total))}
                  </span>
                  <Badge variant={orderStatusVariant(order.status)}>
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
