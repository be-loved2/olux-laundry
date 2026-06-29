import { z } from 'zod';

export const TIME_SLOTS = [
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
] as const;

export const bookingItemSchema = z.object({
  priceItemId: z.string().min(1),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(0),
});

export const newAddressSchema = z.object({
  label: z.string().trim().optional().or(z.literal('')),
  street: z.string().trim().min(3, 'Enter a street address'),
  city: z.string().trim().min(2, 'Enter a city'),
  state: z.string().trim().min(2, 'Enter a state'),
  zoneId: z.string().min(1, 'Select a delivery zone'),
});

export const bookingSchema = z
  .object({
    serviceId: z.string().min(1, 'Select a service'),
    items: z.array(bookingItemSchema).min(1, 'Add at least one item'),
    pickupDate: z.string().min(1, 'Select a pickup date'),
    pickupTimeSlot: z.enum(TIME_SLOTS, { message: 'Select a pickup time' }),
    addressId: z.string().optional().or(z.literal('')),
    newAddress: newAddressSchema.optional(),
    specialInstructions: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((data) => data.items.some((item) => item.quantity > 0), {
    message: 'Add at least one item to your order',
    path: ['items'],
  })
  .refine((data) => Boolean(data.addressId) || Boolean(data.newAddress), {
    message: 'Choose a saved address or add a new one',
    path: ['addressId'],
  })
  .refine(
    (data) => {
      const date = new Date(data.pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: 'Pickup date must be today or later', path: ['pickupDate'] },
  );

export type BookingInput = z.infer<typeof bookingSchema>;
