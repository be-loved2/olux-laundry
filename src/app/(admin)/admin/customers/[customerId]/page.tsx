import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AdminCustomerActions } from '@/components/admin/admin-customer-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { orderStatusLabel, orderStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customer — Admin' };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'customers.view')) redirect('/admin');

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      user: true,
      addresses: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { service: true },
        take: 20,
      },
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!customer) notFound();

  const canSuspend = hasPermission(session!.user.role, 'customers.suspend');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <a href="/admin/customers" className="hover:underline">Customers</a> / {customer.user.name}
          </p>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">{customer.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.user.email}
            {customer.user.phone ? ` · ${customer.user.phone}` : ''} · joined{' '}
            {customer.createdAt.toDateString()}
          </p>
        </div>
        <Badge variant={customer.user.status === 'ACTIVE' ? 'success' : 'destructive'}>
          {customer.user.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total orders', value: customer.totalOrders },
          { label: 'Total spent', value: formatCurrency(Number(customer.totalSpent)) },
          { label: 'Loyalty points', value: customer.loyaltyPoints },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-oxblue-900">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order history</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {customer.orders.length === 0 && (
                <p className="px-6 py-6 text-sm text-muted-foreground">No orders yet.</p>
              )}
              {customer.orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.orderNumber}`}
                  className="flex justify-between px-6 py-3 text-sm transition-colors hover:bg-secondary/40"
                >
                  <div>
                    <p className="font-medium text-oxblue-900">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.service.name} · {o.createdAt.toDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(Number(o.total))}</span>
                    <Badge variant={orderStatusVariant(o.status)}>{orderStatusLabel(o.status)}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved addresses</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {customer.addresses.length === 0 && (
                <p className="px-6 py-4 text-sm text-muted-foreground">No addresses.</p>
              )}
              {customer.addresses.map((a) => (
                <div key={a.id} className="px-6 py-3 text-sm">
                  {a.label && <span className="font-medium text-oxblue-900">{a.label} — </span>}
                  {a.street}, {a.city}, {a.state}
                  {a.isDefault && (
                    <Badge variant="muted" className="ml-2 text-xs">Default</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          {canSuspend && (
            <AdminCustomerActions
              userId={customer.userId}
              currentStatus={customer.user.status}
            />
          )}
        </div>
      </div>
    </div>
  );
}
