'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';

import { OrderStatusEmail } from '@/emails/order-status-email';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { orderStatusLabel } from '@/lib/status';
import { sendEmail } from '@/server/services/mailer';
import { smsTemplates } from '@/server/services/sms';

// ─── Notification helpers ────────────────────────────────────────────────────

const STATUS_NOTIFICATION_MAP: Record<
  string,
  { type: string; title: string; message: (orderNumber: string) => string; smsKey?: keyof typeof smsTemplates } | null
> = {
  CONFIRMED: {
    type: 'PICKUP_CONFIRMED',
    title: 'Order confirmed',
    message: (n) => `Your order ${n} has been confirmed. We're preparing for your pickup.`,
    smsKey: 'orderConfirmed',
  },
  PICKED_UP: {
    type: 'LAUNDRY_RECEIVED',
    title: 'Laundry picked up',
    message: (n) => `We've picked up your laundry for order ${n}. Time to get to work!`,
    smsKey: 'pickedUp',
  },
  RECEIVED: {
    type: 'LAUNDRY_RECEIVED',
    title: 'Laundry received at facility',
    message: (n) => `Your laundry for order ${n} has arrived at our facility.`,
  },
  WASHING: {
    type: 'SYSTEM',
    title: 'Laundry in progress',
    message: (n) => `Your order ${n} is being washed.`,
  },
  QUALITY_CHECK: {
    type: 'LAUNDRY_COMPLETED',
    title: 'Quality check in progress',
    message: (n) => `Your order ${n} is almost ready — just a final quality check.`,
  },
  OUT_FOR_DELIVERY: {
    type: 'OUT_FOR_DELIVERY',
    title: 'Out for delivery',
    message: (n) => `Great news! Your order ${n} is on its way to you.`,
    smsKey: 'readyForDelivery',
  },
  DELIVERED: {
    type: 'DELIVERED',
    title: 'Order delivered',
    message: (n) => `Your order ${n} has been delivered. We hope you love it!`,
    smsKey: 'delivered',
  },
  CANCELLED: null, // handled separately via cancelOrderAction
};

async function sendOrderStatusNotification(
  orderId: string,
  status: string,
  note?: string,
): Promise<void> {
  const mapping = STATUS_NOTIFICATION_MAP[status];
  if (!mapping) return;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
      },
    });
    if (!order) return;

    const user = order.customer.user;
    const { title, message, type, smsKey } = mapping;

    // In-app
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: type as any,
        title,
        message: message(order.orderNumber),
        metadata: { orderId, orderNumber: order.orderNumber },
      },
    });

    // Email
    if (user.email) {
      sendEmail({
        to: user.email,
        subject: `Order ${order.orderNumber}: ${orderStatusLabel(status)}`,
        react: OrderStatusEmail({
          name: user.name ?? 'Valued Customer',
          orderNumber: order.orderNumber,
          statusLabel: orderStatusLabel(status),
          statusMessage: message(order.orderNumber),
          note,
        }),
      }).catch((err) => console.error('[admin:status-email] Failed:', err));
    }

    // SMS
    if (smsKey && user.phone) {
      const { sendSms } = await import('@/server/services/sms');
      const normalised = user.phone.startsWith('+')
        ? user.phone
        : `+234${user.phone.replace(/^0/, '')}`;
      const smsFn = smsTemplates[smsKey] as (orderNumber: string) => string;
      sendSms({ to: normalised, message: smsFn(order.orderNumber) }).catch((err) =>
        console.error('[admin:status-sms] Failed:', err),
      );
    }
  } catch (err) {
    console.error('[admin:sendOrderStatusNotification] Failed:', err);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'orders.edit')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: status as any } }),
      prisma.orderStatusEvent.create({
        data: { orderId, status: status as any, note: note ?? null, changedById: session.user.id },
      }),
    ]);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);

    // Fire-and-forget notification
    sendOrderStatusNotification(orderId, status, note);

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update order status.' };
  }
}

export async function assignRiderAction(
  orderId: string,
  riderId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'orders.assignRider')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.order.update({ where: { id: orderId }, data: { riderId } });
    revalidatePath('/admin/orders');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to assign rider.' };
  }
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'orders.edit')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledReason: reason },
      }),
      prisma.orderStatusEvent.create({
        data: { orderId, status: 'CANCELLED', note: reason, changedById: session.user.id },
      }),
    ]);
    revalidatePath('/admin/orders');

    // Notify the customer about cancellation
    sendOrderStatusNotification(orderId, 'CANCELLED', reason).catch(() => {});
    // Write in-app notification directly since CANCELLED isn't in the map
    prisma.order
      .findUnique({
        where: { id: orderId },
        include: { customer: { include: { user: { select: { id: true } } } } },
      })
      .then((order) => {
        if (!order) return;
        return prisma.notification.create({
          data: {
            userId: order.customer.userId,
            type: 'SYSTEM',
            title: 'Order cancelled',
            message: `Your order ${order.orderNumber} has been cancelled. Reason: ${reason}`,
            metadata: { orderId, orderNumber: order.orderNumber },
          },
        });
      })
      .catch(() => {});

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to cancel order.' };
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function suspendCustomerAction(
  userId: string,
  suspend: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'customers.suspend')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: suspend ? 'SUSPENDED' : 'ACTIVE' },
    });
    revalidatePath('/admin/customers');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update customer status.' };
  }
}

// ─── Services & Pricing ───────────────────────────────────────────────────────

export async function createServiceAction(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'services.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!data.name.trim() || !data.slug.trim()) {
    return { success: false, error: 'Name and slug are required.' };
  }

  try {
    await prisma.service.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    revalidatePath('/admin/services');
    return { success: true };
  } catch {
    return { success: false, error: 'A service with that slug may already exist.' };
  }
}

export async function toggleServiceAction(
  serviceId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'services.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.service.update({ where: { id: serviceId }, data: { isActive } });
    revalidatePath('/admin/services');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update service.' };
  }
}

export async function createPriceItemAction(data: {
  serviceId: string;
  name: string;
  unit: string;
  price: number;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'pricing.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!data.name.trim() || data.price <= 0) {
    return { success: false, error: 'Name and a positive price are required.' };
  }

  try {
    await prisma.priceItem.create({
      data: {
        serviceId: data.serviceId,
        name: data.name.trim(),
        unit: data.unit as any,
        price: data.price,
      },
    });
    revalidatePath('/admin/services');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to create price item.' };
  }
}

export async function updatePriceItemAction(
  priceItemId: string,
  price: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'pricing.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (price <= 0) return { success: false, error: 'Price must be positive.' };

  try {
    await prisma.priceItem.update({ where: { id: priceItemId }, data: { price } });
    revalidatePath('/admin/services');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update price.' };
  }
}

export async function togglePriceItemAction(
  priceItemId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'pricing.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.priceItem.update({ where: { id: priceItemId }, data: { isActive } });
    revalidatePath('/admin/services');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update price item.' };
  }
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export async function updateStaffRoleAction(
  userId: string,
  role: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'staff.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }
  if (userId === session.user.id) {
    return { success: false, error: "You can't change your own role." };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
    revalidatePath('/admin/staff');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update staff role.' };
  }
}

export async function suspendStaffAction(
  userId: string,
  suspend: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'staff.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }
  if (userId === session.user.id) {
    return { success: false, error: "You can't suspend yourself." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: suspend ? 'SUSPENDED' : 'ACTIVE' },
    });
    revalidatePath('/admin/staff');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update staff status.' };
  }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function moderateReviewAction(
  reviewId: string,
  approve: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'reviews.moderate')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: approve, moderatedById: session.user.id },
    });
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update review.' };
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function upsertSettingAction(
  key: string,
  value: unknown,
  group: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'settings.manage')) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as any, group },
      update: { value: value as any },
    });
    revalidatePath('/admin/settings');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save setting.' };
  }
}
