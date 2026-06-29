import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { fetchNotificationsAction } from '@/server/actions/notifications';

import { NotificationCenter } from './notification-center';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/dashboard/notifications');

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
