import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { BookingWizard } from '@/components/booking/booking-wizard';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Book a pickup' };

export default async function BookPickupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/book-pickup');
  }

  const [services, zones, customer] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { priceItems: { where: { isActive: true } } },
    }),
    prisma.deliveryZone.findMany({ where: { isActive: true } }),
    prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: { addresses: { orderBy: { isDefault: 'desc' } } },
    }),
  ]);

  const serviceOptions = services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    priceItems: service.priceItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
    })),
  }));

  const zoneOptions = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    deliveryFee: Number(zone.deliveryFee),
    estimatedTime: zone.estimatedTime,
  }));

  const addressOptions = (customer?.addresses ?? []).map((address) => ({
    id: address.id,
    label: address.label,
    street: address.street,
    city: address.city,
    state: address.state,
    zoneId: address.zoneId,
  }));

  return (
    <div className="container py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-oxblue-900">Book a pickup</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you need washed and when to grab it.
        </p>
      </div>
      <BookingWizard services={serviceOptions} zones={zoneOptions} addresses={addressOptions} />
    </div>
  );
}
