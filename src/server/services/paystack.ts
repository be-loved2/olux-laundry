const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const secretKey = process.env.PAYSTACK_SECRET_KEY;
const isConfigured = Boolean(secretKey);

interface InitializeTransactionInput {
  email: string;
  amountNaira: number;
  reference: string;
  metadata?: Record<string, unknown>;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  reference: string;
  mocked: boolean;
}

/**
 * Initializes a Paystack transaction.
 *
 * Without PAYSTACK_SECRET_KEY configured, returns a mock checkout URL instead
 * of failing — so the booking → payment flow keeps working end to end during
 * development. The webhook verification below mirrors this: it auto-succeeds
 * in mock mode so order status updates can still be tested locally.
 */
export async function initializeTransaction({
  email,
  amountNaira,
  reference,
  metadata,
}: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  if (!isConfigured) {
    console.log(
      `[paystack:dev-mock] Initializing mock transaction ref=${reference} amount=₦${amountNaira}`,
    );
    return {
      authorizationUrl: `/payment/mock-checkout?reference=${reference}`,
      reference,
      mocked: true,
    };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: Math.round(amountNaira * 100), reference, metadata }),
  });

  const json = await response.json();
  if (!response.ok || !json.status) {
    throw new Error(json.message ?? 'Failed to initialize Paystack transaction');
  }

  return {
    authorizationUrl: json.data.authorization_url,
    reference: json.data.reference,
    mocked: false,
  };
}

interface RefundTransactionInput {
  transactionReference: string;
  amountNaira: number;
}

interface RefundTransactionResult {
  status: 'success' | 'pending' | 'failed';
  refundReference: string;
  mocked: boolean;
}

/**
 * Initiates a refund against a previously successful transaction.
 *
 * Without PAYSTACK_SECRET_KEY configured, this mocks an instantly-successful
 * refund so the admin refund flow can be built and tested end to end without
 * a real Paystack account — mirroring the mock-checkout/auto-verify pattern
 * above. In live mode it calls Paystack's real `/refund` endpoint.
 */
export async function initiateRefund({
  transactionReference,
  amountNaira,
}: RefundTransactionInput): Promise<RefundTransactionResult> {
  const refundReference = `OLX-RFD-${transactionReference}-${Date.now()}`;

  if (!isConfigured) {
    console.log(
      `[paystack:dev-mock] Mock-refunding transaction ref=${transactionReference} amount=₦${amountNaira} -> ${refundReference}`,
    );
    return { status: 'success', refundReference, mocked: true };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction: transactionReference,
      amount: Math.round(amountNaira * 100),
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.status) {
    throw new Error(json.message ?? 'Failed to initiate Paystack refund');
  }

  const refundStatus = json.data?.status as string | undefined;
  return {
    status: refundStatus === 'processed' || refundStatus === 'success' ? 'success' : 'pending',
    refundReference: json.data?.id ? String(json.data.id) : refundReference,
    mocked: false,
  };
}

interface VerifyTransactionResult {
  status: 'success' | 'failed' | 'abandoned';
  reference: string;
  amountNaira: number;
  mocked: boolean;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  if (!isConfigured) {
    console.log(
      `[paystack:dev-mock] Auto-verifying mock transaction ref=${reference} as successful.`,
    );
    return { status: 'success', reference, amountNaira: 0, mocked: true };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const json = await response.json();
  if (!response.ok || !json.status) {
    throw new Error(json.message ?? 'Failed to verify Paystack transaction');
  }

  return {
    status: json.data.status,
    reference: json.data.reference,
    amountNaira: json.data.amount / 100,
    mocked: false,
  };
}
