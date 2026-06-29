import Link from 'next/link';

import { NotificationsBell, type NotificationItem } from '@/components/shared/notifications-bell';
import { SidebarNav, type NavItem } from '@/components/shared/sidebar-nav';
import { SignOutButton } from '@/components/shared/sign-out-button';

export function DashboardChrome({
  brand,
  userLabel,
  navItems = [],
  notifications = [],
  unreadCount = 0,
  children,
}: {
  brand: string;
  userLabel: string;
  navItems?: NavItem[];
  notifications?: NotificationItem[];
  unreadCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b border-border bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-base font-bold text-oxblue-900">
            O Lux <span className="text-primary">{brand}</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationsBell notifications={notifications} unreadCount={unreadCount} />
            <span className="hidden text-sm text-muted-foreground sm:inline">{userLabel}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="container flex gap-8 py-10">
        {navItems.length > 0 && (
          <aside className="hidden w-56 shrink-0 md:block">
            <SidebarNav items={navItems} />
          </aside>
        )}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
