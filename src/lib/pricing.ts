interface PriceableItem {
  unitPrice: number;
  quantity: number;
}

export interface BookingTotal {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

/**
 * Computes the order total from line items + delivery fee. Used on both the
 * client (live preview as the customer fills out the form) and the server
 * (authoritative recalculation before the order is written to the database —
 * the server never trusts a client-submitted total).
 */
export function calculateBookingTotal(
  items: PriceableItem[],
  deliveryFee: number,
  discount = 0,
): BookingTotal {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(subtotal + deliveryFee - discount, 0);
  return { subtotal, deliveryFee, discount, total };
}
