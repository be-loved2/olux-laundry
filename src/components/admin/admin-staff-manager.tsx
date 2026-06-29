'use client';

import { useState, useTransition } from 'react';
import { suspendStaffAction, updateStaffRoleAction } from '@/server/actions/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const STAFF_ROLES = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'LAUNDRY_STAFF', 'DELIVERY_RIDER'];
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  LAUNDRY_STAFF: 'Laundry Staff',
  DELIVERY_RIDER: 'Delivery Rider',
};

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  isAvailable: boolean | null;
  createdAt: string;
}

export function AdminStaffManager({
  staff,
  currentUserId,
}: {
  staff: StaffMember[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  function handleRoleUpdate(userId: string) {
    const role = selectedRole[userId];
    if (!role) return;
    startTransition(async () => {
      const res = await updateStaffRoleAction(userId, role);
      if (res.success) { flash('Role updated.', true); setEditingRole(null); }
      else flash(res.error ?? 'Failed.', false);
    });
  }

  function handleToggleSuspend(userId: string, isSuspended: boolean) {
    startTransition(async () => {
      const res = await suspendStaffAction(userId, !isSuspended);
      if (res.success) flash(!isSuspended ? 'Account suspended.' : 'Account reactivated.', true);
      else flash(res.error ?? 'Failed.', false);
    });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {staff.map((s) => {
            const isSelf = s.id === currentUserId;
            const isSuspended = s.status === 'SUSPENDED';

            return (
              <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-oxblue-900">{s.name}</p>
                    {isSelf && <Badge variant="muted" className="text-xs">You</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.email}{s.phone ? ` · ${s.phone}` : ''} · joined {s.createdAt}
                  </p>
                  {s.vehicleType && (
                    <p className="text-xs text-muted-foreground">
                      {s.vehicleType}{s.vehiclePlate ? ` · ${s.vehiclePlate}` : ''}
                      {s.isAvailable != null && ` · ${s.isAvailable ? 'Available' : 'Unavailable'}`}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isSuspended ? 'destructive' : 'muted'}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </Badge>

                  {!isSelf && editingRole === s.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="rounded border border-border px-2 py-1 text-xs"
                        value={selectedRole[s.id] ?? s.role}
                        onChange={(e) => setSelectedRole((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                      <button
                        disabled={isPending}
                        onClick={() => handleRoleUpdate(s.id)}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingRole(null)} className="text-xs text-muted-foreground hover:underline">
                        Cancel
                      </button>
                    </div>
                  ) : !isSelf ? (
                    <button
                      onClick={() => { setEditingRole(s.id); setSelectedRole((prev) => ({ ...prev, [s.id]: s.role })); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Change role
                    </button>
                  ) : null}

                  {!isSelf && (
                    <button
                      disabled={isPending}
                      onClick={() => handleToggleSuspend(s.id, isSuspended)}
                      className={`text-xs hover:underline disabled:opacity-50 ${isSuspended ? 'text-emerald-600' : 'text-destructive'}`}
                    >
                      {isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {staff.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No staff yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
