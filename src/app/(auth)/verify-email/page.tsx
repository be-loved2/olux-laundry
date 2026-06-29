import { CheckCircle2, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyEmailAction } from '@/server/actions/auth';

import { ResendVerificationButton } from './resend-verification-button';

export const metadata: Metadata = { title: 'Verify email' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing verification link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This link is missing required information. Please use the link from your email.
          </p>
        </CardContent>
      </Card>
    );
  }

  const result = await verifyEmailAction(email, token);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
        {result.success ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <CardTitle>Email verified</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your email address has been confirmed. You&apos;re all set.
            </p>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        ) : (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <CardTitle>Link expired</CardTitle>
            <p className="text-sm text-muted-foreground">{result.error}</p>
            <ResendVerificationButton email={email} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
