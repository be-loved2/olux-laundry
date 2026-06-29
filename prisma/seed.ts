import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type PriceUnit = 'PER_ITEM' | 'PER_KG' | 'PER_LOAD';

async function main() {
  // --- Super admin -----------------------------------------------------
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@oluxlaundry.com' },
    update: {},
    create: {
      name: 'O Lux Admin',
      email: 'admin@oluxlaundry.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
    },
  });

  // --- Services ----------------------------------------------------------
  const services = [
    {
      name: 'Wash & Fold',
      slug: 'wash-fold',
      description: 'Everyday laundry, washed, dried and neatly folded.',
    },
    {
      name: 'Dry Cleaning',
      slug: 'dry-cleaning',
      description: 'Gentle care for suits, gowns and delicate fabrics.',
    },
    {
      name: 'Ironing',
      slug: 'ironing',
      description: 'Crisp, professional pressing for any garment.',
    },
  ];

  for (const [index, svc] of services.entries()) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {},
      create: { ...svc, sortOrder: index },
    });
  }

  const washFold = await prisma.service.findUniqueOrThrow({ where: { slug: 'wash-fold' } });
  const dryCleaning = await prisma.service.findUniqueOrThrow({ where: { slug: 'dry-cleaning' } });
  const ironing = await prisma.service.findUniqueOrThrow({ where: { slug: 'ironing' } });

  // --- Price items (admin-editable, matches the spec's item list) -------
  const priceItems: { serviceId: string; name: string; price: number; unit?: PriceUnit }[] = [
    { serviceId: washFold.id, name: 'Shirts', price: 500 },
    { serviceId: washFold.id, name: 'Native Wear', price: 800 },
    { serviceId: washFold.id, name: 'Bed Sheets', price: 1200 },
    { serviceId: dryCleaning.id, name: 'Suits', price: 3500 },
    { serviceId: dryCleaning.id, name: 'Duvets', price: 4000 },
    { serviceId: dryCleaning.id, name: 'Curtains', price: 2500 },
    { serviceId: dryCleaning.id, name: 'Blankets', price: 3000 },
    { serviceId: ironing.id, name: 'Shirts', price: 300 },
    { serviceId: ironing.id, name: 'Native Wear', price: 500 },
  ];

  for (const item of priceItems) {
    const existing = await prisma.priceItem.findFirst({
      where: { serviceId: item.serviceId, name: item.name },
    });
    if (!existing) {
      await prisma.priceItem.create({ data: item });
    }
  }

  // --- Delivery zones ------------------------------------------------------
  const zones = [
    { name: 'Lagos Mainland', deliveryFee: 1000, estimatedTime: 'Next day' },
    { name: 'Lagos Island', deliveryFee: 1500, estimatedTime: 'Next day' },
    { name: 'Lekki / Ajah', deliveryFee: 2000, estimatedTime: '48 hours' },
  ];
  for (const zone of zones) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: zone.name } });
    if (!existing) await prisma.deliveryZone.create({ data: zone });
  }

  // --- Core settings -------------------------------------------------------
  const settings: { key: string; value: unknown; group: string }[] = [
    { key: 'business.name', value: 'O Lux Laundry', group: 'business' },
    {
      key: 'business.tagline',
      value: 'Premium Laundry Pickup & Delivery Service',
      group: 'business',
    },
    { key: 'business.email', value: 'hello@oluxlaundry.com', group: 'business' },
    { key: 'business.phone', value: '+234 800 000 0000', group: 'business' },
    {
      key: 'business.hours',
      value: { mon_sat: '8:00 AM - 8:00 PM', sun: '10:00 AM - 4:00 PM' },
      group: 'business',
    },
  ];
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as object },
      create: setting as { key: string; value: object; group: string },
    });
  }

  console.log('✅ Seed complete.');
  console.log('   Admin login: admin@oluxlaundry.com / ChangeMe123!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
