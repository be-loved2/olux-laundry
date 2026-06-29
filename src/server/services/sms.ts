/**
 * SMS Notification Service — Mock Implementation
 *
 * Uses the Termii API interface (popular for Nigerian SMS delivery).
 * When TERMII_API_KEY is not set (local dev), logs to console instead of
 * sending. Replace the `sendReal` branch with any SMS provider (Twilio,
 * AfricasTalking, Termii, etc.) without changing callers.
 */

const apiKey = process.env.TERMII_API_KEY;
const senderId = process.env.SMS_SENDER_ID ?? 'OLuxLaundry';

export interface SendSmsOptions {
  to: string; // E.164 format, e.g. +2348012345678
  message: string;
}

export interface SendSmsResult {
  mocked: boolean;
  messageId?: string;
}

export async function sendSms({ to, message }: SendSmsOptions): Promise<SendSmsResult> {
  if (!apiKey) {
    console.log(
      `\n[sms:dev-mock] No TERMII_API_KEY set — logging SMS instead of sending.\n` +
        `  To: ${to}\n  Message: ${message}\n`,
    );
    return { mocked: true };
  }

  try {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    });

    const data = (await res.json()) as { message_id?: string; message?: string };

    if (!res.ok) {
      throw new Error(data.message ?? 'SMS send failed');
    }

    return { mocked: false, messageId: data.message_id };
  } catch (err) {
    console.error('[sms] Failed to send SMS:', err);
    // Fail soft — notification failure must never crash a booking or payment flow.
    return { mocked: true };
  }
}

// ---------------------------------------------------------------------------
// Pre-built message templates
// ---------------------------------------------------------------------------

export const smsTemplates = {
  bookingCreated: (orderNumber: string) =>
    `Hi! Your O Lux Laundry order ${orderNumber} has been received and is pending confirmation. We'll notify you once confirmed.`,

  orderConfirmed: (orderNumber: string) =>
    `Great news! Your O Lux Laundry order ${orderNumber} is confirmed. We'll pick it up on the scheduled date.`,

  pickedUp: (orderNumber: string) =>
    `Your laundry for order ${orderNumber} has been picked up. Sit back - we'll handle the rest!`,

  readyForDelivery: (orderNumber: string) =>
    `Your order ${orderNumber} is clean and ready! Our rider is heading to you now.`,

  delivered: (orderNumber: string) =>
    `Your O Lux Laundry order ${orderNumber} has been delivered. Thank you for choosing us!`,

  paymentReceived: (orderNumber: string, amount: string) =>
    `Payment of ${amount} received for order ${orderNumber}. Your O Lux Laundry order is confirmed.`,

  refundProcessed: (orderNumber: string, amount: string) =>
    `A refund of ${amount} has been processed for your O Lux Laundry order ${orderNumber}. It may take 2-5 business days to reflect.`,
} as const;
