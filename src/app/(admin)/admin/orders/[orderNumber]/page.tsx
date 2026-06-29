import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';

import { OrderTimeline } from '@/components/booking/order-timeline';
import { AdminOrderActions } from '@/components/admin/admin-order-actions';
import { AdminRefundPanel } from '@/components/admin/admin-refund-panel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { orderStatusLabel, orderStatusVariant, paymentStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Order — Admin' };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'orders.view')) redirect('/admin');

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      service: true,
      address: { include: { zone: true } },
      customer: { include: { user: true } },
      items: true,
      invoice: true,
      payments: { include: { refunds: { orderBy: { createdAt: 'desc' } } } },
      statusEvents: { orderBy: { createdAt: 'asc' }, include: { changedBy: true } },
      rider: { include: { user: true } },
      review: true,
    },
  });

  if (!order) notFound();

  const canEdit = hasPermission(session!.user.role, 'orders.edit');
  const canAssignRider = hasPermission(session!.user.role, 'orders.assignRider');
  const canRefund = hasPermission(session!.user.role, 'payments.refund');

  const availableRiders = canAssignRider
    ? await prisma.deliveryRider.findMany({
        where: { isAvailable: true },
        include: { user: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <a href="/admin/orders" className="hover:underline">Orders</a> / {order.orderNumber}
          </p>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {order.customer.user.name} · {order.customer.user.email} · placed{' '}
            {order.createdAt.toDateString()}
          </p>
        </div>
        <Badge variant={orderStatusVariant(order.status)} className="text-sm px-3 py-1.5">
          {orderStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items & pricing</CardTitle>
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
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatCurrency(Number(order.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-oxblue-900">
                  <span>Total</span>
                  <span>{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Service:</span> {order.service.name}
              </p>
              <p>
                <span className="font-medium text-foreground">Pickup:</span>{' '}
                {order.pickupDate.toDateString()} · {order.pickupTimeSlot}
              </p>
              <p>
                <span className="font-medium text-foreground">Address:</span>{' '}
                {order.address.street}, {order.address.city}, {order.address.state}
                {order.address.zone && ` (${order.address.zone.name})`}
              </p>
              {order.rider && (
                <p>
                  <span className="font-medium text-foreground">Rider:</span>{' '}
                  {order.rider.user.name} — {order.rider.vehicleType ?? 'Vehicle unknown'}
                  {order.rider.vehiclePlate ? ` · ${order.rider.vehiclePlate}` : ''}
                </p>
              )}
              {order.specialInstructions && (
                <p>
                  <span className="font-medium text-foreground">Notes:</span>{' '}
                  {order.specialInstructions}
                </p>
              )}
              {order.cancelledReason && (
                <p className="text-destructive">
                  <span className="font-medium">Cancellation reason:</span> {order.cancelledReason}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          {order.payments.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Payments</CardTitle>
                {order.invoice && (
                  <a
                    href={`/api/invoices/${order.orderNumber}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" /> Invoice
                  </a>
                )}
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {order.payments.map((p) => (
                  <div key={p.id} className="space-y-3 px-6 py-3 text-sm">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-oxblue-900">{formatCurrency(Number(p.amount))}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.method} · {p.reference}
                        </p>
                      </div>
                      <Badge variant={paymentStatusVariant(p.status)}>{p.status}</Badge>
                    </div>
                    {p.status === 'SUCCESS' && (
                      <AdminRefundPanel
                        paymentId={p.id}
                        paymentAmount={Number(p.amount)}
                        canRefund={canRefund}
                        refunds={p.refunds.map((r) => ({
                          id: r.id,
                          amount: Number(r.amount),
                          reason: r.reason,
                          status: r.status,
                          reference: r.reference,
                          createdAt: r.createdAt.toISOString(),
                        }))}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Status history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status history</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {order.statusEvents.map((ev) => (
                <div key={ev.id} className="flex gap-4 px-6 py-3 text-sm">
                  <div className="w-28 shrink-0 text-xs text-muted-foreground">
                    {ev.createdAt.toLocaleDateString()} {ev.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <span className="font-medium text-oxblue-900">{orderStatusLabel(ev.status)}</span>
                    {ev.note && <span className="ml-2 text-muted-foreground">— {ev.note}</span>}
                    {ev.changedBy && (
                      <p className="text-xs text-muted-foreground">by {ev.changedBy.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Customer review */}
          {order.review && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer review</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium text-oxblue-900">{'★'.repeat(order.review.rating)}{'☆'.repeat(5 - order.review.rating)} ({order.review.rating}/5)</p>
                {order.review.comment && (
                  <p className="text-muted-foreground">{order.review.comment}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {order.review.isApproved ? 'Approved' : 'Pending moderation'} · submitted {order.review.createdAt.toDateString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline status={order.status} serviceName={order.service.name} />
            </CardContent>
          </Card>

          {(canEdit || canAssignRider) && (
            <AdminOrderActions
              orderId={order.id}
              currentStatus={order.status}
              currentRiderId={order.riderId ?? null}
              availableRiders={availableRiders.map((r) => ({
                id: r.id,
                name: r.user.name,
                vehicleType: r.vehicleType,
              }))}
              canEdit={canEdit}
              canAssignRider={canAssignRider}
            />
          )}
        </div>
      </div>
    </div>
  );
}
