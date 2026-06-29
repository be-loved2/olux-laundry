import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customers — Admin' };

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'customers.view')) redirect('/admin');

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Customers</h1>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {customers.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No customers yet.</p>
          )}
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/customers/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-secondary/40"
            >
              <div>
                <p className="text-sm font-semibold text-oxblue-900">{c.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.user.email} · joined {c.createdAt.toDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {c.totalOrders} orders · {formatCurrency(Number(c.totalSpent))}
                </span>
                <Badge variant={c.user.status === 'ACTIVE' ? 'success' : 'destructive'}>
                  {c.user.status}
                </Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
