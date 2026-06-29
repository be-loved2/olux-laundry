import { z } from 'zod';

export const reviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1, 'Select a rating').max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
