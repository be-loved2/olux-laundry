import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { ReportsDashboard } from '@/components/reports/reports-dashboard';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { fetchReportsDataAction } from '@/server/actions/reports';

export const metadata: Metadata = { title: 'Reports & Analytics — Admin' };

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session!.user.role, 'reports.view')) redirect('/admin');

  // Default: last 30 days
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);

  const initialFilter = {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };

  const result = await fetchReportsDataAction(initialFilter);
  if (!result.success) redirect('/admin');

  const canExport = hasPermission(session!.user.role, 'reports.export');

  return (
    <ReportsDashboard
      canExport={canExport}
      initialData={result.data}
      initialFilter={initialFilter}
    />
  );
}
