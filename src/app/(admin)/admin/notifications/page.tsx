import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { fetchNotificationsAction } from '@/server/actions/notifications';

import { NotificationCenter } from '@/app/(customer)/dashboard/notifications/notification-center';

export const metadata: Metadata = { title: 'Notifications · Admin' };

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { notifications, total, unreadCount } = await fetchNotificationsAction({
    page: 1,
    pageSize: 50,
  });

  return (
    <NotificationCenter
      initialNotifications={notifications}
      initialTotal={total}
      initialUnreadCount={unreadCount}
    />
  );
}
