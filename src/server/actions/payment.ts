'use server';

import { getServerSession } from 'next-auth';

import { PaymentConfirmedEmail } from '@/emails/payment-confirmed-email';
import { RefundProcessedEmail } from '@/emails/refund-processed-email';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { sendEmail } from '@/server/services/mailer';
import { smsTemplates } from '@/server/services/sms';
import { initializeTransaction, initiateRefund, verifyTransaction } from '@/server/services/paystack';

export type PaymentActionResult =
  { success: true; authorizationUrl: string } | { success: false; error: string };

export async function initiateOrderPaymentAction(orderId: string): Promise<PaymentActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: 'Please sign in to pay for this order.' };
  }

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  const order = customer
    ? await prisma.order.findFirst({ where: { id: orderId, customerId: customer.id } })
    : null;

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  const invoice = await prisma.invoice.findUnique({ where: { orderId: order.id } });
  if (invoice?.status === 'PAID') {
    return { success: false, error: 'This order has already been paid for.' };
  }

  const reference = `OLX-PAY-${order.orderNumber}-${Date.now()}`;

  const { authorizationUrl } = await initializeTransaction({
    email: session.user.email ?? '',
    amountNaira: Number(order.total),
    reference,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      customerId: customer!.id,
      amount: order.total,
      reference,
      status: 'PENDING',
    },
  });

  return { success: true, authorizationUrl };
}

export type CompletePaymentResult =
  { success: true; orderNumber: string } | { success: false; error: string };

export async function completePaymentAction(reference: string): Promise<CompletePaymentResult> {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    return { success: false, error: 'We could not find that payment.' };
  }

  if (payment.status === 'SUCCESS') {
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    return { success: true, orderNumber: order!.orderNumber };
  }

  const verification = await verifyTransaction(reference);
  if (verification.status !== 'success') {
    await prisma.payment.update({ where: { reference }, data: { status: 'FAILED' } });
    return { success: false, error: 'Payment was not successful.' };
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { reference },
      data: { status: 'SUCCESS', paidAt: new Date() },
    });

    const updated = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'CONFIRMED' },
      include: {
        customer: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      },
    });

    await tx.invoice.update({
      where: { orderId: payment.orderId },
      data: { status: 'PAID', amountPaid: payment.amount },
    });

    await tx.orderStatusEvent.create({ data: { orderId: payment.orderId, status: 'CONFIRMED' } });

    await tx.customer.update({
      where: { id: payment.customerId },
      data: { totalSpent: { increment: payment.amount } },
    });

    await tx.notification.create({
      data: {
        userId: updated.customer.userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment received',
        message: `We've received your payment for order ${updated.orderNumber}.`,
        metadata: { orderId: updated.id, orderNumber: updated.orderNumber },
      },
    });

    return updated;
  });

  // ── Multi-channel notifications ────────────────────────────────────────
  const user = order.customer.user;
  const formattedAmount = `₦${Number(payment.amount).toLocaleString()}`;
  const paidAt = new Date().toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Email
  if (user.email) {
    sendEmail({
      to: user.email,
      subject: `Payment confirmed – ${order.orderNumber}`,
      react: PaymentConfirmedEmail({
        name: user.name ?? 'Valued Customer',
        orderNumber: order.orderNumber,
        amount: formattedAmount,
        paymentMethod: 'Paystack',
        paidAt,
      }),
    }).catch((err) => console.error('[payment] Email failed:', err));
  }

  // SMS
  if (user.phone) {
    const { sendSms } = await import('@/server/services/sms');
    const normalised = user.phone.startsWith('+')
      ? user.phone
      : `+234${user.phone.replace(/^0/, '')}`;
    sendSms({
      to: normalised,
      message: smsTemplates.paymentReceived(order.orderNumber, formattedAmount),
    }).catch((err) => console.error('[payment] SMS failed:', err));
  }

  return { success: true, orderNumber: order.orderNumber };
}

export type RefundActionResult = { success: true } | { success: false; error: string };

export async function requestRefundAction(
  paymentId: string,
  reason: string,
  amountNaira?: number,
): Promise<RefundActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, 'payments.refund')) {
    return { success: false, error: 'You do not have permission to issue refunds.' };
  }

  if (!reason.trim()) {
    return { success: false, error: 'A refund reason is required.' };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      refunds: true,
      order: {
        include: {
          customer: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
        },
      },
    },
  });

  if (!payment) {
    return { success: false, error: 'Payment not found.' };
  }

  if (payment.status !== 'SUCCESS') {
    return { success: false, error: 'Only successful payments can be refunded.' };
  }

  const alreadyRefunded = payment.refunds
    .filter((r) => r.status === 'SUCCESS')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remaining = Number(payment.amount) - alreadyRefunded;

  if (remaining <= 0) {
    return { success: false, error: 'This payment has already been fully refunded.' };
  }

  const refundAmount = amountNaira ?? remaining;
  if (refundAmount <= 0 || refundAmount > remaining) {
    return { success: false, error: `Refund amount must be between ₦1 and ₦${remaining.toLocaleString()}.` };
  }

  const { status, refundReference } = await initiateRefund({
    transactionReference: payment.reference,
    amountNaira: refundAmount,
  });

  const newTotalRefunded = alreadyRefunded + (status === 'success' ? refundAmount : 0);
  const isFullyRefunded = newTotalRefunded >= Number(payment.amount);

  await prisma.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        amount: refundAmount,
        reason,
        status: status === 'success' ? 'SUCCESS' : 'FAILED',
        reference: refundReference,
        initiatedById: session.user.id,
        processedAt: status === 'success' ? new Date() : null,
      },
    });

    if (status === 'success') {
      if (isFullyRefunded) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
        await tx.invoice.update({ where: { orderId: payment.orderId }, data: { status: 'VOID' } });
      }

      await tx.customer.update({
        where: { id: payment.customerId },
        data: { totalSpent: { decrement: refundAmount } },
      });

      await tx.notification.create({
        data: {
          userId: payment.order.customer.userId,
          type: 'REFUND_PROCESSED',
          title: 'Refund processed',
          message: `A refund of ₦${refundAmount.toLocaleString()} was issued for order ${payment.order.orderNumber}.`,
          metadata: { orderId: payment.orderId, orderNumber: payment.order.orderNumber },
        },
      });
    }
  });

  if (status !== 'success') {
    return { success: false, error: 'The refund could not be processed. Please try again.' };
  }

  // ── Multi-channel notifications for refund ────────────────────────────
  const user = payment.order.customer.user;
  const formattedAmount = `₦${refundAmount.toLocaleString()}`;
  const processedAt = new Date().toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  if (user.email) {
    sendEmail({
      to: user.email,
      subject: `Refund processed – ${payment.order.orderNumber}`,
      react: RefundProcessedEmail({
        name: user.name ?? 'Valued Customer',
        orderNumber: payment.order.orderNumber,
        amount: formattedAmount,
        reason,
        processedAt,
      }),
    }).catch((err) => console.error('[refund] Email failed:', err));
  }

  if (user.phone) {
    const { sendSms } = await import('@/server/services/sms');
    const normalised = user.phone.startsWith('+')
      ? user.phone
      : `+234${user.phone.replace(/^0/, '')}`;
    sendSms({
      to: normalised,
      message: smsTemplates.refundProcessed(payment.order.orderNumber, formattedAmount),
    }).catch((err) => console.error('[refund] SMS failed:', err));
  }

  return { success: true };
}
