'use client';

import { useState, useTransition } from 'react';

import { assignRiderAction, cancelOrderAction, updateOrderStatusAction } from '@/server/actions/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderStatusLabel } from '@/lib/status';

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PICKUP_ASSIGNED',
  'PICKED_UP',
  'RECEIVED',
  'WASHING',
  'DRY_CLEANING',
  'IRONING',
  'PACKAGING',
  'QUALITY_CHECK',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

interface Rider {
  id: string;
  name: string;
  vehicleType: string | null;
}

export function AdminOrderActions({
  orderId,
  currentStatus,
  currentRiderId,
  availableRiders,
  canEdit,
  canAssignRider,
}: {
  orderId: string;
  currentStatus: string;
  currentRiderId: string | null;
  availableRiders: Rider[];
  canEdit: boolean;
  canAssignRider: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [selectedRider, setSelectedRider] = useState(currentRiderId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  const isFinal = currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED';

  function flash(msg: string, isError = false) {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  }

  function handleStatusUpdate(status: string) {
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, status, note || undefined);
      if (res.success) {
        flash('Status updated.');
        setNote('');
      } else {
        flash(res.error ?? 'Failed.', true);
      }
    });
  }

  function handleAssignRider() {
    if (!selectedRider) return;
    startTransition(async () => {
      const res = await assignRiderAction(orderId, selectedRider);
      if (res.success) flash('Rider assigned.');
      else flash(res.error ?? 'Failed.', true);
    });
  }

  function handleCancel() {
    if (!cancelReason.trim()) { setError('Please provide a cancellation reason.'); return; }
    startTransition(async () => {
      const res = await cancelOrderAction(orderId, cancelReason);
      if (res.success) { flash('Order cancelled.'); setShowCancel(false); setCancelReason(''); }
      else flash(res.error ?? 'Failed.', true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Admin actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(error || success) && (
          <p className={`rounded-lg px-3 py-2 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {error ?? success}
          </p>
        )}

        {canEdit && !isFinal && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Update status</p>
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Optional note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-1.5">
              {ORDER_STATUSES.filter((s) => s !== 'CANCELLED' && s !== currentStatus).map((s) => (
                <button
                  key={s}
                  disabled={isPending}
                  onClick={() => handleStatusUpdate(s)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  → {orderStatusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {canAssignRider && !isFinal && availableRiders.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assign rider</p>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
            >
              <option value="">Choose a rider…</option>
              {availableRiders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.vehicleType ? ` · ${r.vehicleType}` : ''}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedRider || isPending}
              onClick={handleAssignRider}
              className="w-full"
            >
              Assign rider
            </Button>
          </div>
        )}

        {canEdit && !isFinal && (
          <div className="border-t border-border pt-4">
            {!showCancel ? (
              <button
                onClick={() => setShowCancel(true)}
                className="text-sm text-destructive hover:underline"
              >
                Cancel this order…
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-destructive">Cancellation reason</p>
                <textarea
                  className="w-full rounded-lg border border-destructive/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  rows={2}
                  placeholder="Reason for cancellation…"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={isPending} onClick={handleCancel}>
                    Confirm cancel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCancel(false)}>
                    Never mind
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isFinal && (
          <p className="text-sm text-muted-foreground">
            This order is <Badge variant={currentStatus === 'DELIVERED' ? 'success' : 'destructive'}>{orderStatusLabel(currentStatus)}</Badge> — no further actions available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
