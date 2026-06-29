'use client';

import { useState, useTransition } from 'react';
import { suspendCustomerAction } from '@/server/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminCustomerActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const isSuspended = currentStatus === 'SUSPENDED';

  function toggle() {
    startTransition(async () => {
      const res = await suspendCustomerAction(userId, !isSuspended);
      setMsg({ text: res.success ? (isSuspended ? 'Account reactivated.' : 'Account suspended.') : (res.error ?? 'Failed.'), ok: res.success });
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </p>
        )}
        <Button
          variant={isSuspended ? 'outline' : 'destructive'}
          size="sm"
          disabled={isPending}
          onClick={toggle}
          className="w-full"
        >
          {isSuspended ? 'Reactivate account' : 'Suspend account'}
        </Button>
      </CardContent>
    </Card>
  );
}
