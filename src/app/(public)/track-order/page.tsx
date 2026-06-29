import type { Metadata } from 'next';
import Link from 'next/link';

import { OrderTimeline } from '@/components/booking/order-timeline';
import { PayNowButton } from '@/components/booking/pay-now-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Track your order' };

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; email?: string }>;
}) {
  const { order: orderNumber, email } = await searchParams;

  let order: Awaited<ReturnType<typeof loadOrder>> = null;
  let searched = false;

  if (orderNumber && email) {
    searched = true;
    order = await loadOrder(orderNumber, email);
  }

  return (
    <div className="container max-w-2xl py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-oxblue-900">Track your order</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your order number and the email you booked with.
        </p>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="order">Order number</Label>
              <Input
                id="order"
                name="order"
                placeholder="OLX-20260627-A1B2"
                defaultValue={orderNumber}
                required
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={email}
                required
              />
            </div>
            <Button type="submit">Track</Button>
          </form>
        </CardContent>
      </Card>

      {searched && !order && (
        <p className="text-center text-sm text-muted-foreground">
          We couldn&apos;t find an order matching those details. Double-check your order number and
          email.
        </p>
      )}

      {order && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order {order.orderNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{order.service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup</span>
                <span className="font-medium">
                  {order.pickupDate.toDateString()} · {order.pickupTimeSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right font-medium">
                  {order.address.street}, {order.address.city}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-oxblue-900">
                <span>Total</span>
                <span>{formatCurrency(Number(order.total))}</span>
              </div>
            </CardContent>
          </Card>

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

          <p className="text-center text-sm text-muted-foreground">
            Have an account?{' '}
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              View all your orders in your dashboard
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

async function loadOrder(orderNumber: string, email: string) {
  return prisma.order.findFirst({
    where: {
      orderNumber,
      customer: { user: { email: email.trim().toLowerCase() } },
    },
    include: {
      service: true,
      address: true,
      invoice: true,
    },
  });
}
