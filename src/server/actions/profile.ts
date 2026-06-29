'use server';

import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  type ChangePasswordInput,
  type UpdateProfileInput,
  changePasswordSchema,
  updateProfileSchema,
} from '@/lib/validations/profile';

export type ProfileActionResult = { success: true } | { success: false; error: string };

export async function updateProfileAction(input: UpdateProfileInput): Promise<ProfileActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: 'Please sign in.' };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });

  return { success: true };
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<ProfileActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: 'Please sign in.' };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return { success: false, error: 'Could not verify your current password.' };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Your current password is incorrect.' };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  return { success: true };
}
