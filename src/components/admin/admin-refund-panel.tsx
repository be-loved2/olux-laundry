'use client';

import { useState, useTransition } from 'react';

import { requestRefundAction } from '@/server/actions/payment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { refundStatusVariant } from '@/lib/status';
import { formatCurrency } from '@/lib/utils';

interface RefundRecord {
  id: string;
  amount: number;
  reason: string;
  status: string;
  reference: string;
  createdAt: string;
}

export function AdminRefundPanel({
  paymentId,
  paymentAmount,
  refunds,
  canRefund,
}: {
  paymentId: string;
  paymentAmount: number;
  refunds: RefundRecord[];
  canRefund: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const alreadyRefunded = refunds
    .filter((r) => r.status === 'SUCCESS')
    .reduce((sum, r) => sum + r.amount, 0);
  const remaining = paymentAmount - alreadyRefunded;

  function handleSubmit() {
    if (!reason.trim()) {
      setError('Please give a reason for the refund.');
      return;
    }
    const parsedAmount = amount.trim() ? Number(amount) : undefined;
    if (parsedAmount !== undefined && (Number.isNaN(parsedAmount) || parsedAmount <= 0)) {
      setError('Enter a valid refund amount.');
      return;
    }

    startTransition(async () => {
      const res = await requestRefundAction(paymentId, reason, parsedAmount);
      if (res.success) {
        setSuccess('Refund processed.');
        setError(null);
        setOpen(false);
        setAmount('');
        setReason('');
      } else {
        setError(res.error);
        setSuccess(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {refunds.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {refunds.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <div>
                <p className="font-medium text-oxblue-900">
                  {formatCurrency(r.amount)} refund
                </p>
                <p className="text-muted-foreground">{r.reason}</p>
                <p className="text-muted-foreground">{r.reference}</p>
              </div>
              <Badge variant={refundStatusVariant(r.status)}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {(error || success) && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {error ?? success}
        </p>
      )}

      {canRefund && remaining > 0 && (
        <>
          {!open ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Issue refund…
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Up to {formatCurrency(remaining)} available to refund
              </p>
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={`Amount (leave blank for full ${formatCurrency(remaining)})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
              <textarea
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={2}
                placeholder="Reason for refund…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={isPending} onClick={handleSubmit}>
                  Confirm refund
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Never mind
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {remaining <= 0 && (
        <p className="text-xs text-muted-foreground">This payment has been fully refunded.</p>
      )}
    </div>
  );
}
