import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

const FULL_SEQUENCE = [
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
] as const;

const PROCESSING_STAGES = new Set(['WASHING', 'DRY_CLEANING', 'IRONING']);

const STAGE_LABELS: Record<string, string> = {
  PENDING: 'Order received',
  CONFIRMED: 'Confirmed',
  PICKUP_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  RECEIVED: 'Received at facility',
  WASHING: 'Washing',
  DRY_CLEANING: 'Dry cleaning',
  IRONING: 'Ironing',
  PACKAGING: 'Packaging',
  QUALITY_CHECK: 'Quality check',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

/** Picks which of washing/dry-cleaning/ironing actually applies to this order's service. */
function relevantSequence(serviceName: string) {
  const lower = serviceName.toLowerCase();
  const processingStage = lower.includes('dry clean')
    ? 'DRY_CLEANING'
    : lower.includes('iron')
      ? 'IRONING'
      : 'WASHING';

  return FULL_SEQUENCE.filter(
    (stage) => !PROCESSING_STAGES.has(stage) || stage === processingStage,
  );
}

export function OrderTimeline({ status, serviceName }: { status: string; serviceName: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
        This order was cancelled.
      </div>
    );
  }

  const sequence = relevantSequence(serviceName);
  const currentIndex = sequence.indexOf(status as (typeof FULL_SEQUENCE)[number]);

  return (
    <ol className="space-y-0">
      {sequence.map((stage, index) => {
        const isComplete = currentIndex >= 0 && index < currentIndex;
        const isActive = index === currentIndex;
        const isLast = index === sequence.length - 1;

        return (
          <li key={stage} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isComplete && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-oxblue-100',
                  !isComplete && !isActive && 'bg-secondary text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'my-1 h-full w-0.5 flex-1',
                    isComplete ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div
              className={cn(
                'pb-6 text-sm',
                isActive ? 'font-semibold text-oxblue-900' : 'text-muted-foreground',
              )}
            >
              {STAGE_LABELS[stage]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
