/**
 * Notification Dispatcher
 *
 * Single entry point for all notification sends. Reads the user's notification
 * preferences (stored per-channel in the Setting table under the
 * "notifications" group) and fans out to whichever channels are enabled.
 *
 * Every channel fails independently and softly — a failed SMS must never
 * abort a payment confirmation or order status update.
 *
 * Usage:
 *   await dispatchNotification(tx, {
 *     userId,
 *     userEmail,
 *     userPhone,
 *     type: 'PAYMENT_RECEIVED',
 *     title: 'Payment received',
 *     message: '...',
 *     emailSubject: 'Your payment was confirmed',
 *     emailBody: <PaymentConfirmedEmail ... />,
 *     smsMessage: 'Payment of ₦5,000 received for OLX-...',
 *     whatsAppMessage: 'Payment of *₦5,000* received for order *OLX-...*',
 *     metadata: { orderId, orderNumber },
 *   });
 */

import type { PrismaClient } from '@prisma/client';
import type React from 'react';

import { sendEmail } from './mailer';
import { sendSms } from './sms';
import { sendWhatsApp } from './whatsapp';

export type NotificationChannel = 'inApp' | 'email' | 'sms' | 'whatsapp';

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/** Default prefs — all channels on except WhatsApp (opt-in). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  inApp: true,
  email: true,
  sms: true,
  whatsapp: false,
};

export interface DispatchNotificationOptions {
  userId: string;
  userEmail?: string | null;
  userPhone?: string | null;
  /** NotificationType enum value */
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  // Channel-specific payloads (optional — channel is skipped when absent)
  emailSubject?: string;
  emailBody?: React.ReactElement;
  smsMessage?: string;
  whatsAppMessage?: string;
  /** Override prefs fetch — useful in tests or when prefs are already loaded */
  prefsOverride?: Partial<NotificationPreferences>;
}

/**
 * Dispatches a notification across all enabled channels for a user.
 *
 * @param db  — Prisma client or transaction client (so callers can include
 *              the in-app notification inside an existing transaction).
 */
export async function dispatchNotification(
  db: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  opts: DispatchNotificationOptions,
): Promise<void> {
  const {
    userId,
    userEmail,
    userPhone,
    type,
    title,
    message,
    metadata,
    emailSubject,
    emailBody,
    smsMessage,
    whatsAppMessage,
    prefsOverride,
  } = opts;

  // ------------------------------------------------------------------
  // 1. Load the user's notification preferences.
  //    They're stored as a JSON blob under key `notifications.prefs.{userId}`.
  // ------------------------------------------------------------------
  let prefs: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFS };

  if (!prefsOverride) {
    try {
      const prefSetting = await (db as PrismaClient).setting.findUnique({
        where: { key: `notifications.prefs.${userId}` },
      });
      if (prefSetting?.value) {
        prefs = { ...prefs, ...(prefSetting.value as Partial<NotificationPreferences>) };
      }
    } catch {
      // Best-effort — fall back to defaults if Setting table is unavailable.
    }
  } else {
    prefs = { ...prefs, ...prefsOverride };
  }

  // ------------------------------------------------------------------
  // 2. In-app notification (always written inside the caller's tx if passed).
  // ------------------------------------------------------------------
  if (prefs.inApp) {
    try {
      await (db as PrismaClient).notification.create({
        data: {
          userId,
          type: type as any,
          title,
          message,
          metadata: metadata ?? undefined,
        },
      });
    } catch (err) {
      console.error('[notification:inApp] Failed to create in-app notification:', err);
    }
  }

  // ------------------------------------------------------------------
  // 3. Email — fire-and-forget, never throws.
  // ------------------------------------------------------------------
  if (prefs.email && emailSubject && emailBody && userEmail) {
    sendEmail({ to: userEmail, subject: emailSubject, react: emailBody }).catch((err) => {
      console.error('[notification:email] Failed to send email:', err);
    });
  }

  // ------------------------------------------------------------------
  // 4. SMS — fire-and-forget, never throws.
  // ------------------------------------------------------------------
  if (prefs.sms && smsMessage && userPhone) {
    // Normalise Nigerian numbers: strip leading 0, prepend +234
    const normalised = userPhone.startsWith('+')
      ? userPhone
      : `+234${userPhone.replace(/^0/, '')}`;
    sendSms({ to: normalised, message: smsMessage }).catch((err) => {
      console.error('[notification:sms] Failed to send SMS:', err);
    });
  }

  // ------------------------------------------------------------------
  // 5. WhatsApp — fire-and-forget, never throws.
  // ------------------------------------------------------------------
  if (prefs.whatsapp && whatsAppMessage && userPhone) {
    const normalised = userPhone.startsWith('+')
      ? userPhone.replace(/^\+/, '')
      : `234${userPhone.replace(/^0/, '')}`;
    sendWhatsApp({ to: normalised, message: whatsAppMessage }).catch((err) => {
      console.error('[notification:whatsapp] Failed to send WhatsApp message:', err);
    });
  }
}
