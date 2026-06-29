import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { DashboardChrome } from '@/components/shared/dashboard-chrome';
import type { NavItem } from '@/components/shared/sidebar-nav';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isStaffRole } from '@/lib/rbac';

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/admin/orders', label: 'Orders', icon: 'Package' },
  { href: '/admin/customers', label: 'Customers', icon: 'Users' },
  { href: '/admin/services', label: 'Services & Pricing', icon: 'ShoppingBag' },
  { href: '/admin/staff', label: 'Staff', icon: 'Truck' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'Star' },
  { href: '/admin/reports', label: 'Reports', icon: 'BarChart3' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/admin/settings', label: 'Settings', icon: 'Settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/admin');
  }
  if (!isStaffRole(session.user.role)) {
    redirect('/dashboard');
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
      brand="Admin"
      userLabel={`${session.user.name ?? session.user.email ?? ''} · ${session.user.role.replace('_', ' ')}`}
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
