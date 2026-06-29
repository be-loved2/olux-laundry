'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { resendVerificationAction } from '@/server/actions/auth';

export function ResendVerificationButton({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!email) return null;

  async function handleResend() {
    setIsSending(true);
    try {
      await resendVerificationAction(email);
      setSent(true);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  if (sent) {
    return <p className="text-sm text-muted-foreground">Check your inbox for a new link.</p>;
  }

  return (
    <Button variant="outline" onClick={handleResend} disabled={isSending}>
      {isSending ? 'Sending…' : 'Resend verification email'}
    </Button>
  );
}
