'use client';

import {
  BarChart3,
  Bell,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Truck,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * Lucide icon components can't cross the Server -> Client Component
 * boundary as props (only plain serializable data can — functions and
 * component references are stripped, which is what was throwing
 * "Only plain objects can be passed to Client Components from Server
 * Components" for every dashboard layout).
 *
 * The fix: Server Component layouts (customer + admin) pass a string key
 * instead of the component itself, and this map — which only ever runs
 * inside this Client Component — resolves that key to the real icon at
 * render time. Add new keys here as new nav items need new icons.
 */
export const ICONS = {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Truck,
  Star,
  BarChart3,
  Bell,
  Settings,
  CreditCard,
  UserCircle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-oxblue-50 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
