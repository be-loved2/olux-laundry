import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';

import { OrderTimeline } from '@/components/booking/order-timeline';
import { PayNowButton } from '@/components/booking/pay-now-button';
import { ReviewForm } from '@/components/booking/review-form';
import { StarRatingDisplay } from '@/components/booking/star-rating-display';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderStatusLabel, orderStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Order details' };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await getServerSession(authOptions);

  const customer = await prisma.customer.findUnique({ where: { userId: session!.user.id } });
  const order = customer
    ? await prisma.order.findFirst({
        where: { orderNumber, customerId: customer.id },
        include: {
          service: true,
          address: true,
          items: true,
          invoice: true,
          review: true,
        },
      })
    : null;

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {order.createdAt.toDateString()}
          </p>
        </div>
        <Badge variant={orderStatusVariant(order.status)}>{orderStatusLabel(order.status)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-2">
                    <span className="text-muted-foreground">
                      {item.quantity}× {item.itemName}
                    </span>
                    <span className="font-medium">{formatCurrency(Number(item.lineTotal))}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery fee</span>
                  <span>{formatCurrency(Number(order.deliveryFee))}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-oxblue-900">
                  <span>Total</span>
                  <span>{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
              <div className="border-t border-border pt-3 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Pickup:</span>{' '}
                  {order.pickupDate.toDateString()} · {order.pickupTimeSlot}
                </p>
                <p>
                  <span className="font-medium text-foreground">Address:</span>{' '}
                  {order.address.street}, {order.address.city}, {order.address.state}
                </p>
                {order.specialInstructions && (
                  <p>
                    <span className="font-medium text-foreground">Notes:</span>{' '}
                    {order.specialInstructions}
                  </p>
                )}
              </div>
              {order.invoice && (
                <a
                  href={`/api/invoices/${order.orderNumber}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Download className="h-4 w-4" /> Download invoice
                </a>
              )}
            </CardContent>
          </Card>

          {order.status === 'DELIVERED' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your review</CardTitle>
              </CardHeader>
              <CardContent>
                {order.review ? (
                  <div className="space-y-2">
                    <StarRatingDisplay rating={order.review.rating} />
                    {order.review.comment && (
                      <p className="text-sm text-muted-foreground">{order.review.comment}</p>
                    )}
                  </div>
                ) : (
                  <ReviewForm orderId={order.id} />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {order.invoice && order.invoice.status !== 'PAID' && (
            <PayNowButton orderId={order.id} total={Number(order.total)} />
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline status={order.status} serviceName={order.service.name} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
