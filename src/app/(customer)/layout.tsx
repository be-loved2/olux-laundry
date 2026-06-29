import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { DashboardChrome } from '@/components/shared/dashboard-chrome';
import type { NavItem } from '@/components/shared/sidebar-nav';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/dashboard/orders', label: 'My Orders', icon: 'Package' },
  { href: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'UserCircle' },
];

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return (
    <DashboardChrome
      brand="Dashboard"
      userLabel={session.user.name ?? session.user.email ?? ''}
      navItems={NAV_ITEMS}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardChrome>
  );
}
