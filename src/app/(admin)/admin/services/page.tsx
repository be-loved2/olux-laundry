import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AdminServiceManager } from '@/components/admin/admin-service-manager';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Services & Pricing — Admin' };

export default async function AdminServicesPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;
  if (!hasPermission(role, 'services.manage') && !hasPermission(role, 'pricing.manage')) {
    redirect('/admin');
  }

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { priceItems: { orderBy: { name: 'asc' } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Services & Pricing</h1>
      <AdminServiceManager
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          isActive: s.isActive,
          priceItems: s.priceItems.map((p) => ({
            id: p.id,
            name: p.name,
            unit: p.unit,
            price: Number(p.price),
            isActive: p.isActive,
          })),
        }))}
        canManageServices={hasPermission(role, 'services.manage')}
        canManagePricing={hasPermission(role, 'pricing.manage')}
      />
    </div>
  );
}
