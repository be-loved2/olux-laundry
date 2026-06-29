/**
 * WhatsApp Notification Service — Mock Implementation
 *
 * Uses the WhatsApp Cloud API (Meta) interface.
 * When WHATSAPP_TOKEN is not set (local dev), logs to console instead of
 * sending. Replace the send function body with any WhatsApp provider
 * (Twilio, 360Dialog, Meta Cloud API) without changing callers.
 *
 * Env vars needed for real sends:
 *   WHATSAPP_TOKEN          — Meta System User Access Token
 *   WHATSAPP_PHONE_NUMBER_ID — From the Meta Business app
 */

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

export interface SendWhatsAppOptions {
  to: string; // E.164 format without the +, e.g. 2348012345678
  message: string;
}

export interface SendWhatsAppResult {
  mocked: boolean;
  messageId?: string;
}

export async function sendWhatsApp({
  to,
  message,
}: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  if (!token || !phoneNumberId) {
    console.log(
      `\n[whatsapp:dev-mock] No WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID — logging instead of sending.\n` +
        `  To: ${to}\n  Message: ${message}\n`,
    );
    return { mocked: true };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      },
    );

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string };
    };

    if (!res.ok || data.error) {
      throw new Error(data.error?.message ?? 'WhatsApp send failed');
    }

    return { mocked: false, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error('[whatsapp] Failed to send WhatsApp message:', err);
    return { mocked: true };
  }
}

// ---------------------------------------------------------------------------
// Pre-built message templates (mirrors SMS templates for consistency)
// ---------------------------------------------------------------------------

export const whatsAppTemplates = {
  bookingCreated: (orderNumber: string) =>
    `👋 Hello! Your *O Lux Laundry* order *${orderNumber}* has been received and is awaiting confirmation. We'll send you an update shortly.`,

  orderConfirmed: (orderNumber: string) =>
    `✅ Your *O Lux Laundry* order *${orderNumber}* is confirmed! We'll pick up your laundry on the scheduled date.`,

  pickedUp: (orderNumber: string) =>
    `🧺 Great news! Your laundry for order *${orderNumber}* has been picked up. We're getting to work!`,

  readyForDelivery: (orderNumber: string) =>
    `🚚 Your order *${orderNumber}* is clean, pressed, and on its way to you! Our rider will arrive shortly.`,

  delivered: (orderNumber: string) =>
    `🎉 Your *O Lux Laundry* order *${orderNumber}* has been delivered. We hope you love the results! Thank you for choosing us.`,

  paymentReceived: (orderNumber: string, amount: string) =>
    `💳 Payment of *${amount}* received for order *${orderNumber}*. Your laundry is in good hands!`,

  refundProcessed: (orderNumber: string, amount: string) =>
    `💰 A refund of *${amount}* has been processed for order *${orderNumber}*. Please allow 2–5 business days for it to reflect in your account.`,
} as const;
