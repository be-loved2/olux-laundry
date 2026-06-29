import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AdminReviewModerator } from '@/components/admin/admin-review-moderator';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Reviews — Admin' };

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'reviews.moderate')) redirect('/admin');

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { include: { user: true } },
      order: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Reviews</h1>
      <AdminReviewModerator
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          isApproved: r.isApproved,
          orderNumber: r.order.orderNumber,
          customerName: r.customer.user.name,
          createdAt: r.createdAt.toDateString(),
        }))}
      />
    </div>
  );
}
