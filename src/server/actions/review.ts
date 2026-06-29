'use server';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { type ReviewInput, reviewSchema } from '@/lib/validations/review';

export type ReviewActionResult = { success: true } | { success: false; error: string };

export async function createReviewAction(input: ReviewInput): Promise<ReviewActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: 'Please sign in to leave a review.' };
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid review.' };
  }

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  const order = customer
    ? await prisma.order.findFirst({ where: { id: parsed.data.orderId, customerId: customer.id } })
    : null;

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }
  if (order.status !== 'DELIVERED') {
    return { success: false, error: 'You can review an order once it has been delivered.' };
  }

  const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existing) {
    return { success: false, error: "You've already reviewed this order." };
  }

  await prisma.review.create({
    data: {
      customerId: customer!.id,
      orderId: order.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  return { success: true };
}
