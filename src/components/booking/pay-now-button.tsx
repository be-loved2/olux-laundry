'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { initiateOrderPaymentAction } from '@/server/actions/payment';

export function PayNowButton({ orderId, total }: { orderId: string; total: number }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handlePay() {
    setIsLoading(true);
    try {
      const result = await initiateOrderPaymentAction(orderId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.authorizationUrl;
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handlePay} disabled={isLoading} className="w-full">
      {isLoading ? 'Redirecting…' : `Pay ₦${total.toLocaleString()} now`}
    </Button>
  );
}
