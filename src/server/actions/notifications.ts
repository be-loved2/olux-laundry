'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPreferences,
} from '@/server/services/notifications';

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

export async function markNotificationsReadAction(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });
}

export async function markNotificationUnreadAction(notificationId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: false },
  });
}

// ---------------------------------------------------------------------------
// Fetch all notifications (paginated, for the notification history page)
// ---------------------------------------------------------------------------

export interface NotificationHistoryItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface FetchNotificationsResult {
  notifications: NotificationHistoryItem[];
  total: number;
  unreadCount: number;
}

export async function fetchNotificationsAction(opts?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}): Promise<FetchNotificationsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { notifications: [], total: 0, unreadCount: 0 };

  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const unreadOnly = opts?.unreadOnly ?? false;

  const where = {
    userId: session.user.id,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      metadata: n.metadata as Record<string, unknown> | null,
    })),
    total,
    unreadCount,
  };
}

// ---------------------------------------------------------------------------
// Delete notifications
// ---------------------------------------------------------------------------

export async function deleteNotificationAction(
  notificationId: string,
): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false };

  try {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: session.user.id },
    });
    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function clearAllNotificationsAction(): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false };

  try {
    await prisma.notification.deleteMany({ where: { userId: session.user.id } });
    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export async function fetchNotificationPrefsAction(): Promise<NotificationPreferences> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return DEFAULT_NOTIFICATION_PREFS;

  const setting = await prisma.setting.findUnique({
    where: { key: `notifications.prefs.${session.user.id}` },
  });

  if (!setting?.value) return DEFAULT_NOTIFICATION_PREFS;

  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(setting.value as Partial<NotificationPreferences>),
  };
}

export async function saveNotificationPrefsAction(
  prefs: Partial<NotificationPreferences>,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: 'Not signed in.' };

  try {
    const key = `notifications.prefs.${session.user.id}`;
    const existing = await prisma.setting.findUnique({ where: { key } });
    const merged = { ...DEFAULT_NOTIFICATION_PREFS, ...(existing?.value ?? {}), ...prefs };

    await prisma.setting.upsert({
      where: { key },
      create: { key, value: merged, group: 'notifications' },
      update: { value: merged },
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save preferences.' };
  }
}
