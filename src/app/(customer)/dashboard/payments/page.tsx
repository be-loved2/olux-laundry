import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { paymentStatusVariant, refundStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Payments' };

export default async function CustomerPaymentsPage() {
  const session = await getServerSession(authOptions);

  const customer = await prisma.customer.findUnique({ where: { userId: session!.user.id } });
  const payments = customer
    ? await prisma.payment.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true } }, refunds: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Payments</h1>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No payments yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/dashboard/orders/${payment.order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="text-sm font-semibold text-oxblue-900">
                    {payment.order.orderNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.createdAt.toDateString()} · {payment.reference}
                  </p>
                  {payment.refunds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Refunded {formatCurrency(
                        payment.refunds
                          .filter((r) => r.status === 'SUCCESS')
                          .reduce((sum, r) => sum + Number(r.amount), 0),
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(Number(payment.amount))}
                  </span>
                  <Badge variant={paymentStatusVariant(payment.status)}>{payment.status}</Badge>
                  {payment.refunds.some((r) => r.status === 'SUCCESS') &&
                    payment.status !== 'REFUNDED' && (
                      <Badge variant={refundStatusVariant('SUCCESS')}>Partial refund</Badge>
                    )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
