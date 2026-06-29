import { z } from 'zod';

import { passwordSchema } from '@/lib/validations/auth';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  phone: z.string().trim().min(7, 'Enter a valid phone number').optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
