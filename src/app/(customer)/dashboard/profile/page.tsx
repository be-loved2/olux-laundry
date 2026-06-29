import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationPrefsForm } from '@/components/notifications/notification-prefs-form';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchNotificationPrefsAction } from '@/server/actions/notifications';

import { ChangePasswordForm } from './change-password-form';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const [user, notifPrefs] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user.id } }),
    fetchNotificationPrefsAction(),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-oxblue-900">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Email: <span className="font-medium text-foreground">{user?.email}</span>{' '}
            {!user?.emailVerified && <span className="text-amber-600">(not verified)</span>}
          </p>
          <ProfileForm defaultValues={{ name: user?.name ?? '', phone: user?.phone ?? '' }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Choose how you want to be notified about your orders and account activity.
          </p>
          <NotificationPrefsForm defaultPrefs={notifPrefs} />
        </CardContent>
      </Card>
    </div>
  );
}
