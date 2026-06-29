'use client';

import { CheckCheck, Loader2, MailOpen, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { NotificationHistoryItem } from '@/server/actions/notifications';
import {
  clearAllNotificationsAction,
  deleteNotificationAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
  markNotificationsReadAction,
} from '@/server/actions/notifications';

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

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'Booking',
  PICKUP_CONFIRMED: 'Pickup',
  LAUNDRY_RECEIVED: 'Received',
  LAUNDRY_COMPLETED: 'Completed',
  OUT_FOR_DELIVERY: 'Delivery',
  DELIVERED: 'Delivered',
  PAYMENT_RECEIVED: 'Payment',
  REFUND_PROCESSED: 'Refund',
  SYSTEM: 'System',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export function NotificationCenter({
  initialNotifications,
  initialTotal,
  initialUnreadCount,
}: {
  initialNotifications: NotificationHistoryItem[];
  initialTotal: number;
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [total, setTotal] = useState(initialTotal);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayed = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  function markAllRead() {
    startTransition(async () => {
      await markNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  }

  function toggleRead(id: string, currentlyRead: boolean) {
    startTransition(async () => {
      if (currentlyRead) {
        await markNotificationUnreadAction(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
        );
        setUnreadCount((c) => c + 1);
      } else {
        await markNotificationReadAction(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    });
  }

  function deleteOne(id: string) {
    startTransition(async () => {
      const n = notifications.find((x) => x.id === id);
      await deleteNotificationAction(id);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
      if (n && !n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    });
  }

  function clearAll() {
    if (!confirm('Clear all notifications? This cannot be undone.')) return;
    startTransition(async () => {
      await clearAllNotificationsAction();
      setNotifications([]);
      setTotal(0);
      setUnreadCount(0);
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-oxblue-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total} total
            {unreadCount > 0 && (
              <span className="ml-1.5 font-medium text-primary">· {unreadCount} unread</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={isPending}
              className="gap-1.5 text-xs"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={isPending}
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <MailOpen className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {filter === 'unread' ? 'No unread notifications.' : "You're all caught up!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => (
            <div
              key={n.id}
              className={`group flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                !n.isRead
                  ? 'border-oxblue-200 bg-oxblue-50/60'
                  : 'border-border bg-white hover:bg-secondary/40'
              }`}
            >
              {/* Icon */}
              <span className="mt-0.5 shrink-0 text-xl leading-none">
                {TYPE_ICONS[n.type] ?? '🔔'}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <Badge variant="muted" className="text-[10px]">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </Badge>
                  {!n.isRead && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => toggleRead(n.id, n.isRead)}
                  disabled={isPending}
                  title={n.isRead ? 'Mark unread' : 'Mark read'}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <MailOpen className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteOne(n.id)}
                  disabled={isPending}
                  title="Delete"
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more hint */}
      {total > notifications.length && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {notifications.length} of {total} notifications.{' '}
          <button
            className="font-medium text-primary hover:underline"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>{' '}
          to load more.
        </p>
      )}
    </div>
  );
}
