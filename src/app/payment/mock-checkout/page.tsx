import type { Metadata } from 'next';

import { MockCheckout } from './mock-checkout';

export const metadata: Metadata = { title: 'Mock checkout' };

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <MockCheckout reference={reference ?? ''} />
    </div>
  );
}
