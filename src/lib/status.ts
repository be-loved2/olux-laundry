type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'muted';

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PICKUP_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  RECEIVED: 'Received',
  WASHING: 'Washing',
  DRY_CLEANING: 'Dry cleaning',
  IRONING: 'Ironing',
  PACKAGING: 'Packaging',
  QUALITY_CHECK: 'Quality check',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function orderStatusVariant(status: string): BadgeVariant {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED') return 'destructive';
  if (status === 'PENDING') return 'muted';
  return 'default';
}

export function paymentStatusVariant(status: string): BadgeVariant {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED' || status === 'REFUNDED') return 'destructive';
  return 'warning';
}

export function invoiceStatusVariant(status: string): BadgeVariant {
  if (status === 'PAID') return 'success';
  if (status === 'VOID') return 'muted';
  return 'warning';
}

export function refundStatusVariant(status: string): BadgeVariant {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'destructive';
  return 'warning';
}

/** Orders still moving through the pipeline (not finished, not cancelled). */
export function isActiveOrderStatus(status: string): boolean {
  return status !== 'DELIVERED' && status !== 'CANCELLED';
}
