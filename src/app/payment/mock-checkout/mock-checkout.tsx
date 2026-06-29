'use client';

import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { completePaymentAction } from '@/server/actions/payment';

export function MockCheckout({ reference }: { reference: string }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handlePay() {
    setIsProcessing(true);
    try {
      const result = await completePaymentAction(reference);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Payment successful!');
      router.push(`/track-order?order=${result.orderNumber}`);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Mock checkout</CardTitle>
        <CardDescription>
          Paystack isn&apos;t configured yet, so this stands in for the real checkout — add
          PAYSTACK_SECRET_KEY in .env to use real payments instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          Reference: <span className="font-mono text-xs">{reference}</span>
        </div>
        <Button className="w-full" onClick={handlePay} disabled={isProcessing}>
          {isProcessing ? 'Processing…' : 'Simulate successful payment'}
        </Button>
      </CardContent>
    </Card>
  );
}
