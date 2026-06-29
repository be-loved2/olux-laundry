'use server';

import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

import { ResetPasswordEmail } from '@/emails/reset-password-email';
import { VerifyEmail } from '@/emails/verify-email';
import { prisma } from '@/lib/prisma';
import {
  type ForgotPasswordInput,
  type RegisterInput,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth';
import { sendEmail } from '@/server/services/mailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export type ActionResult = { success: true; message?: string } | { success: false; error: string };

async function sendVerificationEmail(userId: string, name: string, email: string) {
  const token = nanoid(32);

  // Clear any previous outstanding tokens for this email before issuing a new one.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS) },
  });

  const verifyUrl = `${APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: 'Verify your email — O Lux Laundry',
    react: VerifyEmail({ name, verifyUrl }),
  });
}

export async function registerAction(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: 'An account with that email already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: 'CUSTOMER',
      customer: { create: {} },
    },
  });

  try {
    await sendVerificationEmail(user.id, user.name, user.email);
  } catch (err) {
    // Registration should still succeed even if the verification email fails to send —
    // the user can request another one from the login page.
    console.error('Failed to send verification email:', err);
  }

  return { success: true };
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Don't reveal whether the account exists.
  if (!user || user.emailVerified) {
    return { success: true, message: "If that account needs verifying, we've sent a new link." };
  }

  await sendVerificationEmail(user.id, user.name, user.email);
  return { success: true, message: "If that account needs verifying, we've sent a new link." };
}

export async function verifyEmailAction(email: string, token: string): Promise<ActionResult> {
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });

  if (!record || record.expires < new Date()) {
    return { success: false, error: 'This verification link is invalid or has expired.' };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } }),
  ]);

  return { success: true };
}

export async function requestPasswordResetAction(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const genericMessage = "If an account exists for that email, we've sent a reset link.";
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return the same response whether or not the account exists, so this
  // endpoint can't be used to enumerate registered email addresses.
  if (!user || !user.passwordHash) {
    return { success: true, message: genericMessage };
  }

  const token = nanoid(32);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your password — O Lux Laundry',
    react: ResetPasswordEmail({ name: user.name, resetUrl }),
  });

  return { success: true, message: genericMessage };
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { success: false, error: 'This reset link is invalid or has expired.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}
