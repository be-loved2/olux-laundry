'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { markNotificationsReadAction } from '@/server/actions/notifications';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  BOOKING_CREATED: '📋',
  PICKUP_CONFIRMED: '✅',
  LAUNDRY_RECEIVED: '🧺',
  LAUNDRY_COMPLETED: '✨',
  OUT_FOR_DELIVERY: '🚚',
  DELIVERED: '🎉',
  PAYMENT_RECEIVED: '💳',
  REFUND_PROCESSED: '💰',
  SYSTEM: '🔔',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const [localNotifications, setLocalNotifications] = useState(notifications);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && localUnread > 0) {
      setLocalUnread(0);
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      markNotificationsReadAction().catch(() => {
        /* best-effort */
      });
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {localUnread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {localUnread > 9 ? '9+' : localUnread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-border bg-white shadow-soft-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notifications
            </p>
            {localNotifications.length > 0 && (
              <Link
                href="/dashboard/notifications"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            )}
          </div>

          {/* Body */}
          {localNotifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {localNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-secondary/50 ${!n.isRead ? 'bg-oxblue-50/60' : ''}`}
                >
                  <span className="mt-0.5 shrink-0 text-base leading-none">
                    {TYPE_ICONS['SYSTEM']}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {localNotifications.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <Link
                href="/dashboard/notifications"
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                <CheckCheck className="h-3 w-3" />
                See full notification history
              </Link>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
