'use server';

import { getServerSession } from 'next-auth';

import { AdminNewBookingEmail } from '@/emails/admin-new-booking-email';
import { BookingConfirmedEmail } from '@/emails/booking-confirmed-email';
import { authOptions } from '@/lib/auth';
import { calculateBookingTotal } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { generateOrderNumber } from '@/lib/utils';
import { type BookingInput, bookingSchema } from '@/lib/validations/booking';
import { dispatchNotification } from '@/server/services/notifications';
import { sendEmail } from '@/server/services/mailer';
import { smsTemplates } from '@/server/services/sms';
import { whatsAppTemplates } from '@/server/services/whatsapp';

export type BookingActionResult =
  { success: true; orderNumber: string } | { success: false; error: string };

export async function createBookingAction(input: BookingInput): Promise<BookingActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: 'Please sign in to book a pickup.' };
  }

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid booking details.' };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) {
    return { success: false, error: 'We could not find your customer profile.' };
  }

  const service = await prisma.service.findFirst({ where: { id: data.serviceId, isActive: true } });
  if (!service) {
    return { success: false, error: 'That service is no longer available.' };
  }

  // Resolve (or create) the pickup address, and find its delivery zone.
  let addressId = data.addressId || undefined;
  let zoneId: string | null = null;

  if (addressId) {
    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing || existing.customerId !== customer.id) {
      return { success: false, error: 'That address could not be found on your account.' };
    }
    zoneId = existing.zoneId;
  } else if (data.newAddress) {
    const created = await prisma.address.create({
      data: {
        customerId: customer.id,
        label: data.newAddress.label || null,
        street: data.newAddress.street,
        city: data.newAddress.city,
        state: data.newAddress.state,
        zoneId: data.newAddress.zoneId,
      },
    });
    addressId = created.id;
    zoneId = created.zoneId;
  } else {
    return { success: false, error: 'Please choose or add a pickup address.' };
  }

  // Re-fetch prices from the database — never trust client-submitted unit prices.
  const requestedIds = data.items
    .filter((item) => item.quantity > 0)
    .map((item) => item.priceItemId);
  const dbPriceItems = await prisma.priceItem.findMany({
    where: { id: { in: requestedIds }, isActive: true, serviceId: data.serviceId },
  });
  const priceById = new Map(dbPriceItems.map((p) => [p.id, p]));

  const orderItemsData = data.items
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const priceItem = priceById.get(item.priceItemId);
      if (!priceItem) {
        throw new Error('One of the items you selected is no longer available.');
      }
      const unitPrice = Number(priceItem.price);
      return {
        priceItemId: priceItem.id,
        itemName: priceItem.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

  if (orderItemsData.length === 0) {
    return { success: false, error: 'Add at least one item to your order.' };
  }

  const zone = zoneId ? await prisma.deliveryZone.findUnique({ where: { id: zoneId } }) : null;
  const deliveryFee = zone ? Number(zone.deliveryFee) : 0;
  const { subtotal, total } = calculateBookingTotal(orderItemsData, deliveryFee);

  const orderNumber = generateOrderNumber();
  const pickupDate = new Date(data.pickupDate);
  const formattedPickup = pickupDate.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTotal = `₦${total.toLocaleString()}`;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          addressId: addressId!,
          serviceId: data.serviceId,
          pickupDate,
          pickupTimeSlot: data.pickupTimeSlot,
          specialInstructions: data.specialInstructions || null,
          subtotal,
          deliveryFee,
          total,
          items: { create: orderItemsData },
          statusEvents: { create: { status: 'PENDING', changedById: session.user.id } },
        },
      });

      await tx.invoice.create({
        data: {
          orderId: created.id,
          invoiceNumber: `INV-${orderNumber}`,
          amountDue: total,
        },
      });

      // In-app notification (inside the transaction)
      await tx.notification.create({
        data: {
          userId: session.user.id,
          type: 'BOOKING_CREATED',
          title: 'Booking received',
          message: `Your order ${orderNumber} has been received and is pending confirmation.`,
          metadata: { orderId: created.id, orderNumber },
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: { totalOrders: { increment: 1 } },
      });

      return created;
    });

    // ── Multi-channel notifications (fire-and-forget, outside the tx) ──────

    // Email to customer
    sendEmail({
      to: session.user.email ?? '',
      subject: `Booking received – ${orderNumber}`,
      react: BookingConfirmedEmail({
        name: session.user.name ?? 'Valued Customer',
        orderNumber,
        pickupDate: formattedPickup,
        pickupTimeSlot: data.pickupTimeSlot,
        serviceName: service.name,
        total: formattedTotal,
      }),
    }).catch((err) => console.error('[booking] Customer email failed:', err));

    // SMS to customer (if phone on file)
    if (session.user.phone) {
      const { sendSms } = await import('@/server/services/sms');
      sendSms({
        to: session.user.phone.startsWith('+')
          ? session.user.phone
          : `+234${session.user.phone.replace(/^0/, '')}`,
        message: smsTemplates.bookingCreated(orderNumber),
      }).catch((err) => console.error('[booking] SMS failed:', err));
    }

    // Admin notification email — find all SUPER_ADMIN users
    prisma.user
      .findMany({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE' } })
      .then((admins) => {
        const itemCount = orderItemsData.reduce((s, i) => s + i.quantity, 0);
        for (const admin of admins) {
          sendEmail({
            to: admin.email,
            subject: `New booking ${orderNumber} from ${session.user.name ?? session.user.email}`,
            react: AdminNewBookingEmail({
              orderNumber,
              customerName: session.user.name ?? 'Customer',
              customerEmail: session.user.email ?? '',
              serviceName: service.name,
              pickupDate: formattedPickup,
              pickupTimeSlot: data.pickupTimeSlot,
              total: formattedTotal,
              itemCount,
            }),
          }).catch((err) => console.error('[booking] Admin email failed:', err));

          // In-app notification for each admin
          prisma.notification
            .create({
              data: {
                userId: admin.id,
                type: 'BOOKING_CREATED',
                title: `New booking: ${orderNumber}`,
                message: `${session.user.name ?? session.user.email} placed a new order for ${service.name} (${formattedTotal}).`,
                metadata: { orderId: order.id, orderNumber },
              },
            })
            .catch(() => {});
        }
      })
      .catch((err) => console.error('[booking] Admin notifications failed:', err));

    return { success: true, orderNumber: order.orderNumber };
  } catch (err) {
    console.error('createBookingAction failed:', err);
    return {
      success: false,
      error: 'Something went wrong while placing your order. Please try again.',
    };
  }
}
