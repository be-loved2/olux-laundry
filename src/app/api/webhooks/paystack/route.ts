import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { completePaymentAction } from '@/server/actions/payment';

const secretKey = process.env.PAYSTACK_SECRET_KEY;

/**
 * Paystack calls this endpoint server-to-server when a transaction's status
 * changes. Only relevant once PAYSTACK_SECRET_KEY is set — in mock mode,
 * payments are completed directly via the mock checkout page instead.
 */
export async function POST(request: Request) {
  if (!secretKey) {
    return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  const expectedSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  if (!signature || signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as { event: string; data: { reference: string } };

  if (event.event === 'charge.success') {
    await completePaymentAction(event.data.reference);
  }

  return NextResponse.json({ received: true });
}
