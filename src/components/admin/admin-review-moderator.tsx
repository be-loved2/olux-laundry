'use client';

import { useState, useTransition } from 'react';
import { moderateReviewAction } from '@/server/actions/admin';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  orderNumber: string;
  customerName: string;
  createdAt: string;
}

export function AdminReviewModerator({ reviews }: { reviews: Review[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  function handleModerate(id: string, approve: boolean) {
    startTransition(async () => {
      const res = await moderateReviewAction(id, approve);
      if (res.success) flash(approve ? 'Review approved.' : 'Review hidden.', true);
      else flash(res.error ?? 'Failed.', false);
    });
  }

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true;
  });

  return (
    <div className="space-y-4">
      {msg && (
        <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {filtered.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No reviews.</p>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-oxblue-900">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <Badge variant={r.isApproved ? 'success' : 'warning'}>
                      {r.isApproved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.customerName} · order {r.orderNumber} · {r.createdAt}
                  </p>
                  {r.comment && (
                    <p className="mt-1 text-sm text-foreground">{r.comment}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!r.isApproved ? (
                    <button
                      disabled={isPending}
                      onClick={() => handleModerate(r.id, true)}
                      className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      disabled={isPending}
                      onClick={() => handleModerate(r.id, false)}
                      className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
