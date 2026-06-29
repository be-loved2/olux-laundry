import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AdminStaffManager } from '@/components/admin/admin-staff-manager';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Staff — Admin' };

export default async function AdminStaffPage() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'staff.manage')) redirect('/admin');

  const staff = await prisma.user.findMany({
    where: { role: { not: 'CUSTOMER' } },
    orderBy: { createdAt: 'asc' },
    include: { deliveryRider: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Staff</h1>
      <AdminStaffManager
        staff={staff.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          phone: u.phone,
          vehicleType: u.deliveryRider?.vehicleType ?? null,
          vehiclePlate: u.deliveryRider?.vehiclePlate ?? null,
          isAvailable: u.deliveryRider?.isAvailable ?? null,
          createdAt: u.createdAt.toDateString(),
        }))}
        currentUserId={session!.user.id}
      />
    </div>
  );
}
