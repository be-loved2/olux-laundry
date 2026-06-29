import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AdminSettingsEditor } from '@/components/admin/admin-settings-editor';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Settings — Admin' };

const SETTING_DEFINITIONS = [
  { key: 'business.name', label: 'Business name', group: 'business', placeholder: 'O Lux Laundry' },
  { key: 'business.phone', label: 'Contact phone', group: 'business', placeholder: '+234 000 000 0000' },
  { key: 'business.email', label: 'Contact email', group: 'business', placeholder: 'hello@oluxlaundry.com' },
  { key: 'business.address', label: 'Business address', group: 'business', placeholder: '1 Laundry St, Lagos' },
  { key: 'business.hours', label: 'Opening hours', group: 'business', placeholder: 'Mon–Sat: 8 am – 6 pm' },
  { key: 'delivery.defaultFee', label: 'Default delivery fee (₦)', group: 'delivery', placeholder: '1500' },
  { key: 'social.instagram', label: 'Instagram URL', group: 'social', placeholder: 'https://instagram.com/…' },
  { key: 'social.twitter', label: 'Twitter / X URL', group: 'social', placeholder: 'https://twitter.com/…' },
  { key: 'social.facebook', label: 'Facebook URL', group: 'social', placeholder: 'https://facebook.com/…' },
];

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'settings.manage')) redirect('/admin');

  const dbSettings = await prisma.setting.findMany();
  const settingMap: Record<string, string> = {};
  for (const s of dbSettings) {
    settingMap[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value);
  }

  const settings = SETTING_DEFINITIONS.map((def) => ({
    ...def,
    value: settingMap[def.key] ?? '',
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Settings</h1>
      <AdminSettingsEditor settings={settings} />
    </div>
  );
}
